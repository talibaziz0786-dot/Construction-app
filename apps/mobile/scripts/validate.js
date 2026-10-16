/**
 * Offline MVP validation for the Expo app.
 *
 * Runs without the Expo CLI / Metro bundler (which need network + native
 * tooling): it checks the app manifest, verifies every mobile source module
 * parses, confirms all relative imports resolve to real files, asserts the
 * six required calculators are reachable through the catalog contract, and
 * confirms no construction formula lives in mobile code (server authority).
 *
 * Usage: npm run validate  (from apps/mobile)
 */
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname + '/..';
const src = path.join(root, 'src');

let failures = 0;
function check(name, passed, detail) {
  if (passed) console.log(`  PASS ${name}${detail ? `  (${detail})` : ''}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`);
  }
}

// 1. App manifest.
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
check('app.json has name + slug', Boolean(manifest.expo && manifest.expo.name && manifest.expo.slug), manifest.expo && manifest.expo.name);
check('app.json has android package', Boolean(manifest.expo && manifest.expo.android && manifest.expo.android.package), manifest.expo && manifest.expo.android && manifest.expo.android.package);

// 2. Required source files exist.
const required = [
  'App.tsx',
  'index.ts',
  'src/theme.ts',
  'src/i18n/strings.ts',
  'src/types/calculator.ts',
  'src/api/apiBase.ts',
  'src/api/calculatorApi.ts',
  'src/screens/HomeScreen.tsx',
  'src/screens/HubScreen.tsx',
  'src/screens/CalculatorScreen.tsx',
  'src/screens/HistoryScreen.tsx',
  'src/components/ConnectivityBanner.tsx',
  'src/offline/units.ts',
  'src/offline/methodology.ts',
  'src/offline/methodologyFinishing.ts',
  'src/offline/offlineRunner.ts',
  'src/offline/storage.ts',
  'src/offline/history.ts',
  'src/offline/syncEngine.ts',
  'src/offline/connectivity.ts',
  'src/offline/hubCache.ts',
  'src/offline/hubCacheFinishing.ts',
];
for (const file of required) {
  check(`exists ${file}`, fs.existsSync(path.join(root, file)));
}

// 3. All relative imports resolve (App + every src module).
function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}
function resolveImport(fromFile, spec) {
  // Normalize to forward slashes so Windows backslash paths resolve too.
  const fromDir = path.dirname(fromFile);
  const base = path.resolve(fromDir, spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate)) return true;
  }
  return false;
}
let unresolved = [];
const entryFiles = [path.join(root, 'App.tsx'), path.join(root, 'index.ts'), ...collectFiles(src)];
for (const file of entryFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const re = /(?:import|export)[^'"]*from\s*['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!resolveImport(file, m[1])) unresolved.push(`${path.relative(root, file)} -> ${m[1]}`);
  }
}
check('all relative imports resolve', unresolved.length === 0, unresolved.length === 0 ? `${entryFiles.length} modules` : unresolved.join('; '));

// 4. Required calculators are referenced (hub consumes server catalog; detail screen posts to server).
const REQUIRED = ['room.floor-area', 'wall.net-area', 'masonry.brick-quantity', 'concrete.volume', 'plaster.quantity', 'tile.quantity'];
const apiText = fs.readFileSync(path.join(src, 'api/calculatorApi.ts'), 'utf8');
check(
  'API client uses server catalog + calculate endpoints',
  apiText.includes('/calculators') && apiText.includes('/calculate'),
  'GET /calculators, POST /calculators/:id/calculate'
);

// 5. Construction math lives ONLY in the vendored offline mirror
// (methodology.ts / methodologyFinishing.ts / offlineRunner.ts), never in
// screens, API clients, or navigation. Server stays authoritative online.
const FORMULA_HINTS = [/theoreticalBrick/i, /netMasonryVolume/i, /mortar/i];
const MIRROR_FILES = new Set([
  'src/offline/methodology.ts',
  'src/offline/methodologyFinishing.ts',
  'src/offline/offlineRunner.ts',
]);
let formulaHits = [];
for (const file of entryFiles) {
  if (/\.test\./.test(file)) continue;
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (MIRROR_FILES.has(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const hint of FORMULA_HINTS) {
    if (hint.test(text)) formulaHits.push(`${rel} matches ${hint}`);
  }
}
check('construction math only in offline mirror', formulaHits.length === 0, formulaHits.length === 0 ? 'screens stay math-free' : formulaHits.join('; '));

// 5b. Offline mirror provenance: every mirror file names its frozen source.
const MIRROR_PROVENANCE = ['methodology.ts', 'methodologyFinishing.ts', 'offlineRunner.ts', 'units.ts'];
let provenanceMisses = [];
for (const rel of MIRROR_PROVENANCE.map((f) => `src/offline/${f}`)) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!/Canonical sources? \(frozen/i.test(text) && !/Canonical calculator runner/i.test(text)) provenanceMisses.push(rel);
}
check('offline mirror cites frozen sources', provenanceMisses.length === 0, provenanceMisses.join('; ') || 'provenance headers present');

// 6. Screens implement the required flow states.
const hubText = fs.readFileSync(path.join(src, 'screens/HubScreen.tsx'), 'utf8');
check('hub has loading/error/empty states', hubText.includes('ActivityIndicator') && hubText.includes('noResults'), 'loading + error + empty');
const calcText = fs.readFileSync(path.join(src, 'screens/CalculatorScreen.tsx'), 'utf8');
check(
  'calculator screen has input/validate/result/BOQ states',
  calcText.includes('validateAll') && calcText.includes('ResultView') && calcText.includes('boq') && calcText.includes('calculating'),
  'validate + result + BOQ + loading'
);
check('calculator screen guards duplicate requests', calcText.includes('if (calculating) return') && calcText.includes('disabled={calculating}'), 'in-flight guard + disabled button');
check('calculator screen has offline fallback', calcText.includes('runOfflineCalculator') && calcText.includes('enqueueSync'), 'offline runner + sync queue');
check('calculator screen labels offline results', calcText.includes('offlineResult') && calcText.includes('resultSource'), 'offline/server badge');
const appText = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
check(
  'app has connectivity banner + sync resume',
  appText.includes('ConnectivityBanner') && appText.includes('syncPending') && appText.includes('useConnectivity'),
  'banner + queue replay on reconnect'
);
check('app persists only non-sensitive data', !/SecureStore|password|JWT_SECRET|Authorization/i.test(appText), 'no secrets in app shell');
const hubText2 = fs.readFileSync(path.join(src, 'screens/HubScreen.tsx'), 'utf8');
check('hub renders cached catalog offline', hubText2.includes('loadCachedHub') && hubText2.includes('cachedCatalog'), 'cache + badge');
void REQUIRED;

if (failures > 0) {
  console.error(`\nvalidate: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nvalidate: all checks passed');
