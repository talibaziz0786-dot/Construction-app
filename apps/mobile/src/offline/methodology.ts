/**
 * Offline methodology (part 1: area + masonry).
 * Canonical sources (frozen): RoomFloorAreaCalculator, WallNetAreaCalculator,
 * MasonryBrickQuantityCalculator. See offline/methodologyFinishing.ts for part 2.
 * Parity enforced by scripts/offline-parity.js.
 */
export interface OpeningValue {
  type: 'door' | 'window' | 'ventilator' | 'other';
  width: number;
  height: number;
  quantity: number;
}

export class OfflineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineInputError';
  }
}

export function num(name: string, value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new OfflineInputError(`Invalid calculator input: ${name} must be a number`);
  }
  if (value < min || value > max) {
    throw new OfflineInputError(`Invalid calculator input: ${name} must be between ${min} and ${max}`);
  }
  return value;
}

export function openingsList(raw: unknown): OpeningValue[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new OfflineInputError('Invalid calculator input: openings must be a list');
  if (raw.length > 50) throw new OfflineInputError('Invalid calculator input: too many openings');
  return raw.map((o) => {
    const r = o as Record<string, unknown>;
    const width = num('opening.width', r.width, 0.1, 20);
    const height = num('opening.height', r.height, 0.1, 20);
    const quantity = num('opening.quantity', r.quantity ?? 1, 1, 50);
    if (!Number.isInteger(quantity)) throw new OfflineInputError('Invalid calculator input: opening quantity must be whole');
    const type = r.type === 'window' || r.type === 'ventilator' || r.type === 'other' ? r.type : 'door';
    return { type, width, height, quantity };
  });
}

export interface WallAreas {
  grossArea: number;
  openingDeduction: number;
  netArea: number;
}

/** Mirrors WallNetAreaCalculator: gross L*H minus opening deductions (metres). */
export function wallNetArea(wallLength: number, wallHeight: number, openings: OpeningValue[]): WallAreas {
  const grossArea = wallLength * wallHeight;
  let openingDeduction = 0;
  for (const o of openings) {
    if (o.width > wallLength || o.height > wallHeight) {
      throw new OfflineInputError('Opening dimensions exceed wall dimensions');
    }
    openingDeduction += o.width * o.height * o.quantity;
  }
  if (openingDeduction > grossArea) {
    throw new OfflineInputError('Total opening deduction area exceeds gross wall area');
  }
  return { grossArea, openingDeduction, netArea: grossArea - openingDeduction };
}

export interface BrickResult {
  netAreaSqM: number;
  netMasonryVolumeCuM: number;
  effectiveBrickModuleCuM: number;
  theoreticalBrickQuantity: number;
  procurementAllowance: number;
  procurementQuantity: number;
  wastagePercentage: number;
  thicknessWarning: string | null;
}

/** Mirrors MasonryBrickQuantityCalculator face-module coursing. */
export function brickQuantity(args: {
  netAreaSqM: number;
  wallThickness: number;
  brickLength: number;
  brickWidth: number;
  brickHeight: number;
  mortarJointThickness: number;
  wastagePercentage: number;
}): BrickResult {
  const { netAreaSqM, wallThickness, brickLength, brickWidth, brickHeight, mortarJointThickness, wastagePercentage } = args;
  const netMasonryVolumeCuM = netAreaSqM * wallThickness;
  const effL = brickLength + mortarJointThickness;
  const effH = brickHeight + mortarJointThickness;
  const effectiveBrickModuleCuM = effL * effH * brickWidth;
  if (!(effectiveBrickModuleCuM > 0) || !Number.isFinite(effectiveBrickModuleCuM)) {
    throw new OfflineInputError('Effective brick module volume must be greater than zero');
  }
  const theoreticalBrickQuantity = netMasonryVolumeCuM / effectiveBrickModuleCuM;
  const procurementAllowance = theoreticalBrickQuantity * (wastagePercentage / 100);
  const procurementQuantity = Math.ceil(theoreticalBrickQuantity + procurementAllowance);
  let thicknessWarning: string | null = null;
  const rel = Math.abs(wallThickness - brickWidth) / Math.max(brickWidth, 1e-9);
  if (rel > 0.05) {
    const wythes = wallThickness / brickWidth;
    thicknessWarning =
      `Wall thickness (${wallThickness.toFixed(4)} m) differs from brick width ` +
      `(${brickWidth.toFixed(4)} m, the thickness direction); count scaled by T/W = ` +
      `${wythes.toFixed(2)} wythes — verify bond pattern for non-single-wythe walls.`;
  }
  return {
    netAreaSqM,
    netMasonryVolumeCuM,
    effectiveBrickModuleCuM,
    theoreticalBrickQuantity,
    procurementAllowance,
    procurementQuantity,
    wastagePercentage,
    thicknessWarning,
  };
}
