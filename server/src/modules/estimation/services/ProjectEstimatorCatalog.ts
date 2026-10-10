import { Unit } from '../domain/units/types.js';

import { EstimationOrchestrator } from '../engine/orchestration/EstimationOrchestrator.js';

export const PROJECT_CALCULATOR_IDS = [
  'room.floor-area',
  'wall.net-area',
  'masonry.brick-quantity',
  'concrete.volume',
  'plaster.quantity',
  'tile.quantity',
] as const;

export type ProjectCalculatorId = (typeof PROJECT_CALCULATOR_IDS)[number];

const FALLBACK_METHODOLOGY_VERSIONS: Record<ProjectCalculatorId, string> = {
  'room.floor-area': '1.0.0',
  'wall.net-area': '1.0.0',
  'masonry.brick-quantity': '1.2.0',
  'concrete.volume': '1.0.0',
  'plaster.quantity': '1.1.0',
  'tile.quantity': '1.0.0',
};

/**
 * Canonical methodology version for a project calculator.
 *
 * Reads the single source of truth — the identity of the calculator actually
 * registered in the canonical registry — instead of a second hardcoded table.
 * The fallback table only covers the instant before `registerCanonicalCalculators`
 * runs (e.g. a test that imports the catalog without booting `app.ts`).
 */
export function methodologyVersionOf(id: ProjectCalculatorId): string {
  const calculator = EstimationOrchestrator.getInstance().getCalculator(id);
  const version = calculator?.identity.methodologyVersion;
  if (typeof version === 'string' && version.length > 0) {
    return version;
  }
  return FALLBACK_METHODOLOGY_VERSIONS[id];
}

export const PROJECT_BOQ_UNITS: Record<string, Unit> = {
  brick: Unit.PIECE,
  concrete: Unit.CU_M,
  cement: Unit.PIECE,
  sand: Unit.CU_M,
  tile: Unit.PIECE,
  plaster: Unit.CU_M,
};
