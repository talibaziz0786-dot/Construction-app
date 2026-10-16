/**
 * Offline calculator runner — executes the six verified quick calculators
 * locally using the vendored methodology mirror.
 *
 * Canonical sources (frozen, authoritative): CalculatorCatalog parse/build/
 * interpret per calculatorId + the six frozen server calculators. This file
 * carries no new formulas; parity enforced by scripts/offline-parity.js.
 * Server remains authoritative: every offline result is labelled offline and
 * re-verified against POST /api/calculators/:id/calculate when online.
 */
import type { CalculatorRunResponse } from '../types/calculator';
import { brickQuantity, num, openingsList, wallNetArea, OfflineInputError } from './methodology';
import { concreteVolume, plasterQuantity, tileQuantity } from './methodologyFinishing';

export type { OfflineInputError };

const VERSIONS: Record<string, string> = {
  'room.floor-area': '1.0.0',
  'wall.net-area': '1.0.0',
  'masonry.brick-quantity': '1.2.0',
  'concrete.volume': '1.0.0',
  'plaster.quantity': '1.1.0',
  'tile.quantity': '1.0.0',
};

export const OFFLINE_CALCULATOR_IDS = Object.keys(VERSIONS);

export function supportsOffline(calculatorId: string): boolean {
  return calculatorId in VERSIONS;
}

function boqNoRates(
  sectionId: string,
  sectionName: string,
  items: Array<{
    id: string; category: string; description: string; quantity: number; unit: string;
    theoreticalQuantity: number; procurementQuantity: number; wastagePercentage: number;
    sourceCalculatorId: string; sourceMethodologyVersion: string;
  }>,
): CalculatorRunResponse['boq'] {
  const priced = items.map((item) => ({
    ...item,
    rate: null,
    currency: 'INR',
    amount: null,
    rateUnavailable: true,
    assumptions: ['Offline result — cached/offline rates are not used; cost requires online rates.'],
    warnings: ['Rate unavailable — amount not calculated'],
  }));
  return {
    projectId: sectionId,
    projectName: sectionName,
    sections: [{
      id: sectionId, name: sectionName, items: priced,
      totalAmount: 0, currency: 'INR', rateUnavailableCount: priced.length,
    }],
    grandTotal: 0,
    currency: 'INR',
    generatedAt: new Date().toISOString(),
    assumptions: ['Offline preliminary estimate. Server verification pending when online.'],
    warnings: [],
    hasMissingRates: priced.length > 0,
  };
}

function base(calculatorId: string, name: string, used: string[], isEstimate: boolean) {
  return {
    calculatorId, name,
    calculator: {
      calculatorId,
      name,
      methodologyVersion: VERSIONS[calculatorId] ?? '1.0.0',
      domain: 'offline-mirror',
    },
    composition: { compositionId: `offline.${calculatorId}`, calculatorsUsed: used },
    status: 'success' as const,
    isEstimate,
  };
}

function emptyBoq(id: string, name: string): CalculatorRunResponse['boq'] {
  return {
    projectId: id, projectName: name, sections: [], grandTotal: 0,
    currency: 'INR', generatedAt: new Date().toISOString(),
    assumptions: ['Offline preliminary estimate. Server verification pending when online.'],
    warnings: [], hasMissingRates: false,
  };
}

function runRoomFloorArea(v: Record<string, unknown>): CalculatorRunResponse {
  const length = num('length', v.length, 0.1, 500);
  const width = num('width', v.width, 0.1, 500);
  const area = length * width;
  return {
    ...base('room.floor-area', 'Room Floor Area', ['room.floor-area'], false),
    resultLabel: 'Floor Area',
    primary: { label: 'Floor Area', value: area, unit: 'sq.m' },
    rows: [], assumptions: [], warnings: [],
    boq: emptyBoq('calculator.room.floor-area', 'Room Floor Area'),
  };
}

function runWallNetArea(v: Record<string, unknown>): CalculatorRunResponse {
  const wallLength = num('wallLength', v.wallLength, 0.1, 500);
  const wallHeight = num('wallHeight', v.wallHeight, 0.5, 30);
  const areas = wallNetArea(wallLength, wallHeight, openingsList(v.openings));
  return {
    ...base('wall.net-area', 'Wall Area', ['wall.net-area'], false),
    resultLabel: 'Net Wall Area',
    primary: { label: 'Net Wall Area', value: areas.netArea, unit: 'sq.m' },
    rows: [
      { label: 'Gross wall area', value: areas.grossArea, unit: 'sq.m' },
      { label: 'Opening deduction', value: areas.openingDeduction, unit: 'sq.m' },
    ],
    assumptions: [], warnings: [],
    boq: emptyBoq('calculator.wall.net-area', 'Wall Area'),
  };
}

function runBrick(v: Record<string, unknown>): CalculatorRunResponse {
  const wallLength = num('wallLength', v.wallLength, 0.1, 500);
  const wallHeight = num('wallHeight', v.wallHeight, 0.5, 30);
  const wallThickness = num('wallThickness', v.wallThickness ?? 0.23, 0.05, 2);
  const brickLength = num('brickLength', v.brickLength ?? 0.19, 0.05, 1);
  const brickWidth = num('brickWidth', v.brickWidth ?? 0.09, 0.05, 1);
  const brickHeight = num('brickHeight', v.brickHeight ?? 0.09, 0.05, 1);
  const joint = num('mortarJointThickness', v.mortarJointThickness ?? 0.01, 0, 0.1);
  const wastage = num('wastagePercentage', v.wastagePercentage ?? 5, 0, 50);
  const areas = wallNetArea(wallLength, wallHeight, openingsList(v.openings));
  const r = brickQuantity({
    netAreaSqM: areas.netArea, wallThickness, brickLength,
    brickWidth, brickHeight, mortarJointThickness: joint, wastagePercentage: wastage,
  });
  return {
    ...base('masonry.brick-quantity', 'Brick Masonry', ['wall.net-area', 'masonry.brick-quantity'], true),
    resultLabel: 'Estimated Requirement',
    primary: { label: 'Bricks required', value: r.procurementQuantity, unit: 'bricks' },
    rows: [
      { label: 'Net wall area', value: areas.netArea, unit: 'sq.m' },
      { label: 'Net masonry volume', value: r.netMasonryVolumeCuM, unit: 'cu.m' },
      { label: 'Theoretical bricks', value: r.theoreticalBrickQuantity, unit: 'bricks' },
      { label: 'Bricks to purchase', value: r.procurementQuantity, unit: 'bricks' },
    ],
    assumptions: [{
      id: 'brick-module-method',
      description: 'Face-module coursing: theoretical = volume / ((L+j) x (H+j) x W)',
      source: 'IS 2212:1991', verified: true,
    }],
    warnings: r.thicknessWarning
      ? [{ code: 'thickness-alignment', message: r.thicknessWarning, severity: 'medium' as const }] : [],
    boq: boqNoRates('calculator.masonry.brick-quantity', 'Brick Masonry', [{
      id: 'brick-1', category: 'brick', description: 'Standard clay brick',
      quantity: r.procurementQuantity, unit: 'piece',
      theoreticalQuantity: r.theoreticalBrickQuantity,
      procurementQuantity: r.procurementQuantity, wastagePercentage: wastage,
      sourceCalculatorId: 'masonry.brick-quantity', sourceMethodologyVersion: '1.2.0',
    }]),
  };
}

function runConcrete(v: Record<string, unknown>): CalculatorRunResponse {
  const length = num('length', v.length, 0.05, 500);
  const width = num('width', v.width, 0.05, 500);
  const depth = num('depth', v.depth, 0.02, 20);
  const wastage = num('wastagePercentage', v.wastagePercentage ?? 5, 0, 50);
  const r = concreteVolume(length, width, depth, wastage);
  return {
    ...base('concrete.volume', 'Concrete Volume', ['concrete.volume'], true),
    resultLabel: 'Estimated Requirement',
    primary: { label: 'Concrete required', value: r.procurementVolume, unit: 'cu.m' },
    rows: [
      { label: 'Net volume', value: r.netVolume, unit: 'cu.m' },
      { label: `Wastage allowance @ ${wastage}%`, value: r.allowance, unit: 'cu.m' },
    ],
    assumptions: [{
      id: 'geometric-volume-only',
      description: 'Pure geometric concrete volume (L x W x Depth). Not structural advice.',
      source: 'Standard Estimation Rules', verified: true,
    }],
    warnings: [],
    boq: boqNoRates('calculator.concrete.volume', 'Concrete Volume', [{
      id: 'concrete-1', category: 'concrete', description: 'Concrete (site mixed / ready mix)',
      quantity: r.procurementVolume, unit: 'cu.m',
      theoreticalQuantity: r.netVolume, procurementQuantity: r.procurementVolume,
      wastagePercentage: wastage,
      sourceCalculatorId: 'concrete.volume', sourceMethodologyVersion: '1.0.0',
    }]),
  };
}

function runPlaster(v: Record<string, unknown>): CalculatorRunResponse {
  const area = num('netSurfaceArea', v.netSurfaceArea, 0.5, 5000);
  const thick = num('plasterThickness', v.plasterThickness ?? 0.012, 0.005, 0.1);
  const wastage = num('wastagePercentage', v.wastagePercentage ?? 5, 0, 50);
  const r = plasterQuantity({ netSurfaceArea: area, plasterThickness: thick, wastagePercentage: wastage });
  return {
    ...base('plaster.quantity', 'Plaster', ['plaster.quantity'], true),
    resultLabel: 'Estimated Requirement',
    primary: { label: 'Plaster volume (wet)', value: r.procurementVolume, unit: 'cu.m' },
    rows: [
      { label: 'Plaster area', value: area, unit: 'sq.m' },
      { label: 'Wet plaster volume', value: r.theoreticalVolume, unit: 'cu.m' },
      { label: `Dry material volume (factor ${r.dryVolumeFactor})`, value: r.dryMaterialVolume, unit: 'cu.m' },
      { label: `Cement required (mix ${r.mixRatio})`, value: r.cementBags, unit: 'bags' },
      { label: 'Sand / balu required', value: r.sandVolume, unit: 'cu.m' },
    ],
    assumptions: [{
      id: 'plaster-volume',
      description: 'Plaster volume = area x thickness; dry factor 1.33; mix 1:4.',
      source: 'Standard Civil Engineering Practice', verified: true,
    }],
    warnings: [],
    boq: boqNoRates('calculator.plaster.quantity', 'Plaster', [{
      id: 'plaster-1', category: 'plaster', description: 'Cement plaster (wet volume)',
      quantity: r.procurementVolume, unit: 'cu.m',
      theoreticalQuantity: r.theoreticalVolume, procurementQuantity: r.procurementVolume,
      wastagePercentage: wastage,
      sourceCalculatorId: 'plaster.quantity', sourceMethodologyVersion: '1.1.0',
    }]),
  };
}

function runTile(v: Record<string, unknown>): CalculatorRunResponse {
  const roomLength = num('roomLength', v.roomLength, 0.1, 500);
  const roomWidth = num('roomWidth', v.roomWidth, 0.1, 500);
  const tileLength = num('tileLength', v.tileLength ?? 0.6, 0.05, 3);
  const tileWidth = num('tileWidth', v.tileWidth ?? 0.6, 0.05, 3);
  const wastage = num('wastagePercentage', v.wastagePercentage ?? 7, 0, 50);
  const r = tileQuantity({ roomLength, roomWidth, tileLength, tileWidth, wastagePercentage: wastage });
  return {
    ...base('tile.quantity', 'Floor Tiles', ['room.floor-area', 'tile.quantity'], true),
    resultLabel: 'Estimated Requirement',
    primary: { label: 'Tiles required', value: r.procurement, unit: 'tiles' },
    rows: [
      { label: 'Floor area', value: r.floorArea, unit: 'sq.m' },
      { label: 'Theoretical tiles', value: r.theoretical, unit: 'tiles' },
      { label: `Wastage allowance @ ${wastage}%`, value: r.allowance, unit: 'tiles' },
    ],
    assumptions: [{
      id: 'tile-count-rounding',
      description: 'Procurement tile count rounded UP to the nearest whole integer.',
      source: 'Standard Construction Practice', verified: true,
    }],
    warnings: [],
    boq: boqNoRates('calculator.tile.quantity', 'Floor Tiles', [{
      id: 'tile-1', category: 'tile', description: 'Floor tiles',
      quantity: r.procurement, unit: 'piece',
      theoreticalQuantity: r.theoretical, procurementQuantity: r.procurement,
      wastagePercentage: wastage,
      sourceCalculatorId: 'tile.quantity', sourceMethodologyVersion: '1.0.0',
    }]),
  };
}

/** Executes a supported calculator offline. Throws OfflineInputError on bad input. */
export function runOfflineCalculator(calculatorId: string, values: Record<string, unknown>): CalculatorRunResponse {
  switch (calculatorId) {
    case 'room.floor-area': return runRoomFloorArea(values);
    case 'wall.net-area': return runWallNetArea(values);
    case 'masonry.brick-quantity': return runBrick(values);
    case 'concrete.volume': return runConcrete(values);
    case 'plaster.quantity': return runPlaster(values);
    case 'tile.quantity': return runTile(values);
    default: throw new OfflineInputError(`Offline calculation not supported for: ${calculatorId}`);
  }
}

