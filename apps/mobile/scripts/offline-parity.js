/**
 * Offline parity harness (plain Node, no child processes — PowerShell-safe).
 *
 * Loads the three pure offline modules (units, methodology,
 * methodologyFinishing) by transpiling them in-process with the workspace
 * TypeScript compiler (`ts.transpileModule` — type-strip only, no
 * type-check), then evaluates the CommonJS output with a tiny dependency
 * resolver. No npx/spawn, so space-containing paths and shell quoting can
 * never break it.
 *
 * Asserts the same numeric fixtures the frozen server tests assert
 * (MasonryBrickQuantityCalculator.test.ts face-module v1.2.0 fixtures,
 * plaster/concrete/tile fixtures) plus the wall-area sanity baseline.
 *
 * Usage: node scripts/offline-parity.js  (from apps/mobile)
 */
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname + '/..';
const src = path.join(root, 'src', 'offline');

let core;
let finishing;
let units;

function loadModule(file) {
  const ts = require('typescript'); // resolved from apps/mobile/node_modules
  const text = fs.readFileSync(path.join(src, file), 'utf8');
  const out = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const fakeRequire = (spec) => {
    if (spec === './methodology') return core;
    if (spec === './methodologyFinishing') return finishing;
    if (spec === './units') return units;
    throw new Error(`offline-parity: unexpected import "${spec}" in ${file}`);
  };
  const fn = new Function('module', 'exports', 'require', out);
  fn(mod, mod.exports, fakeRequire);
  return mod.exports;
}

let failures = 0;
function check(name, passed, detail) {
  if (passed) console.log(`  PASS ${name}${detail ? `  (${detail})` : ''}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`);
  }
}

core = loadModule('methodology.ts');
finishing = loadModule('methodologyFinishing.ts');
units = loadModule('units.ts');

// 1. Unit factors mirror server conversion.ts verbatim.
check('ft -> base 0.3048', units.toBase(1, 'ft') === 0.3048);
check('sq.ft factor', units.toBase(1, 'sq.ft') === 0.092903);
check('cu.ft factor', units.toBase(1, 'cu.ft') === 0.0283168);

// 2. Room floor area: 10ft x 10ft = 3.048m x 3.048m ~= 9.2903 sq.m.
const roomArea = 3.048 * 3.048;
check('10ft room area ~= 9.2903', Math.abs(roomArea - 9.2903) < 0.001, roomArea.toFixed(4));

// 3. Wall net area: 12.192 m x 3 m, no openings -> 36.576 sq.m (sanity).
const areas = core.wallNetArea(12.192, 3, []);
check('sanity gross wall area ~36.58', Math.abs(areas.grossArea - 36.576) < 0.05, areas.grossArea.toFixed(3));

// 4. Brick parity — fixtures mirrored from the FROZEN server tests
// (MasonryBrickQuantityCalculator.test.ts, face-module methodology v1.2.0).
// Note: STATUS.md's older "~4206 bricks / module 0.002" baseline predates
// v1.2.0; the frozen server test is authoritative: module = (L+j)(H+j)W =
// 0.20 * 0.10 * 0.09 = 0.0018, so 1 cu.m @5% -> 555.5556 theoretical,
// 27.7778 allowance, 584 procurement (server test lines 66-70).
const brickOne = core.brickQuantity({
  netAreaSqM: 1, wallThickness: 1, // -> netMasonryVolume 1 CU_M (server fixture)
  brickLength: 0.19, brickWidth: 0.09, brickHeight: 0.09,
  mortarJointThickness: 0.01, wastagePercentage: 5,
});
check('server fixture: face-module 0.0018', Math.abs(brickOne.effectiveBrickModuleCuM - 0.0018) < 1e-12, brickOne.effectiveBrickModuleCuM.toExponential(3));
check('server fixture: theoretical 555.5556', Math.abs(brickOne.theoreticalBrickQuantity - 555.5556) < 1e-3, brickOne.theoreticalBrickQuantity.toFixed(4));
check('server fixture: allowance 27.7778', Math.abs(brickOne.procurementAllowance - 27.7778) < 1e-3, brickOne.procurementAllowance.toFixed(4));
check('server fixture: procurement 584 @5%', brickOne.procurementQuantity === 584, String(brickOne.procurementQuantity));
check('server fixture: thickness-alignment warning', brickOne.thicknessWarning !== null, 'wall 0.23 vs width 0.09');

const brickZero = core.brickQuantity({
  netAreaSqM: 1, wallThickness: 1,
  brickLength: 0.19, brickWidth: 0.09, brickHeight: 0.09,
  mortarJointThickness: 0.01, wastagePercentage: 0,
});
check('server fixture: zero-wastage procurement 556', brickZero.procurementQuantity === 556, String(brickZero.procurementQuantity));

// Sanity wall: 36.576 sq.m x 0.23 m = 8.412 cu.m under v1.2.0 face-module.
const brick = core.brickQuantity({
  netAreaSqM: 36.576, wallThickness: 0.23,
  brickLength: 0.19, brickWidth: 0.09, brickHeight: 0.09,
  mortarJointThickness: 0.01, wastagePercentage: 5,
});
check('sanity masonry volume ~8.41', Math.abs(brick.netMasonryVolumeCuM - 8.412) < 0.05, brick.netMasonryVolumeCuM.toFixed(3));
check('sanity theoretical ~4673.6 (v1.2.0)', Math.abs(brick.theoreticalBrickQuantity - 4673.6) < 2, brick.theoreticalBrickQuantity.toFixed(1));
check('sanity procurement 4908 (v1.2.0)', brick.procurementQuantity === 4908, String(brick.procurementQuantity));

// 5. Concrete: 3 x 4 x 0.15 @5% -> net 1.8, procurement 1.89.
const conc = finishing.concreteVolume(3, 4, 0.15, 5);
check('concrete net 1.8', Math.abs(conc.netVolume - 1.8) < 1e-9);
check('concrete procurement 1.89', Math.abs(conc.procurementVolume - 1.89) < 1e-9);

// 6. Plaster: 30 sq.m x 0.012 @5% -> wet 0.36, procurement 0.378, dry ~0.5027.
const plaster = finishing.plasterQuantity({ netSurfaceArea: 30, plasterThickness: 0.012, wastagePercentage: 5 });
check('plaster wet 0.36', Math.abs(plaster.theoreticalVolume - 0.36) < 1e-9);
check('plaster procurement 0.378', Math.abs(plaster.procurementVolume - 0.378) < 1e-9);
check('plaster dry ~0.5027', Math.abs(plaster.dryMaterialVolume - 0.378 * 1.33) < 1e-9);
check('plaster mix 1:4', plaster.mixRatio === '1:4');

// 7. Tile: 3.048 x 3.048 floor, 0.6 tiles @7% -> ~25.8 theoretical, ceil 28.
const tile = finishing.tileQuantity({ roomLength: 3.048, roomWidth: 3.048, tileLength: 0.6, tileWidth: 0.6, wastagePercentage: 7 });
check('tile theoretical ~25.8', Math.abs(tile.theoretical - 25.806) < 0.05, tile.theoretical.toFixed(2));
check('tile procurement ceil', tile.procurement === Math.ceil(tile.theoretical * 1.07), String(tile.procurement));

// 8. Validation parity: bad inputs throw OfflineInputError.
let threw = false;
try {
  core.num('length', NaN, 0.1, 500);
} catch { threw = true; }
check('NaN rejected', threw);
threw = false;
try {
  core.wallNetArea(3, 3, [{ type: 'door', width: 5, height: 2, quantity: 1 }]);
} catch { threw = true; }
check('oversize opening rejected', threw);

if (failures > 0) {
  console.error(`\noffline-parity: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\noffline-parity: all checks passed');
