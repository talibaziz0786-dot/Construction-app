import { fromCuMeters, fromMeters, fromSqMeters, roundTo } from './unitConversion.js';

export const FT_PER_M = 3.280839895013123;
export const IN_PER_M = 39.37007874015748;

export function metersToFtIn(meters: number): { ft: number; inch: number } {
  if (!Number.isFinite(meters) || meters < 0) return { ft: 0, inch: 0 };
  const totalInches = meters * IN_PER_M;
  const ft = Math.floor(totalInches / 12);
  const inch = roundTo(totalInches - ft * 12, 1);
  return { ft, inch };
}

export function formatFtIn(meters: number): string {
  const { ft, inch } = metersToFtIn(meters);
  if (ft === 0) return `${inch} in`;
  if (inch === 0) return `${ft} ft`;
  return `${ft} ft ${inch} in`;
}

export function ftInToMeters(ft: number, inch: number): number {
  const f = Number.isFinite(ft) ? Math.max(0, ft) : 0;
  const i = Number.isFinite(inch) ? Math.max(0, inch) : 0;
  return (f * 12 + i) * 0.0254;
}

export function formatSqFt(sqMeters: number, decimals = 0): string {
  const v = fromSqMeters(sqMeters, 'sq.ft');
  return `${v.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 })} sq ft`;
}

export function formatCuFt(cuMeters: number, decimals = 0): string {
  const v = fromCuMeters(cuMeters, 'cu.ft');
  return `${v.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 })} cu ft`;
}

export function formatLengthFriendly(meters: number): string {
  if (!Number.isFinite(meters)) return '0 ft';
  if (meters < 0.35) {
    const inches = roundTo(fromMeters(meters, 'in'), 1);
    return `${inches} in`;
  }
  return formatFtIn(meters);
}

export function formatCountFriendly(count: number, unit: string): string {
  const n = Math.ceil(Number.isFinite(count) ? count : 0);
  return `${n.toLocaleString()} ${unit}`;
}
