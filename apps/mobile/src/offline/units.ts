/**
 * Offline unit system — vendored mirror of the canonical server units.
 *
 * Canonical source (frozen, authoritative):
 *   server/src/modules/estimation/domain/units/types.ts
 *   server/src/modules/estimation/domain/units/conversion.ts
 *
 * This file contains NO construction formulas. It only carries the unit
 * conversion factors needed to interpret cached calculator metadata offline.
 * Values are copied verbatim; any change to the canonical files must be
 * mirrored here and re-verified with `scripts/offline-parity.js`.
 */
export type Dimension = 'LENGTH' | 'AREA' | 'VOLUME' | 'MASS' | 'COUNT';

export const CONVERSION_TO_BASE: Record<string, { base: number; dimension: Dimension }> = {
  mm: { base: 0.001, dimension: 'LENGTH' },
  cm: { base: 0.01, dimension: 'LENGTH' },
  m: { base: 1, dimension: 'LENGTH' },
  inch: { base: 0.0254, dimension: 'LENGTH' },
  ft: { base: 0.3048, dimension: 'LENGTH' },
  'sq.mm': { base: 0.000001, dimension: 'AREA' },
  'sq.cm': { base: 0.0001, dimension: 'AREA' },
  'sq.m': { base: 1, dimension: 'AREA' },
  'sq.in': { base: 0.00064516, dimension: 'AREA' },
  'sq.ft': { base: 0.092903, dimension: 'AREA' },
  'cu.mm': { base: 1e-9, dimension: 'VOLUME' },
  'cu.cm': { base: 1e-6, dimension: 'VOLUME' },
  'cu.m': { base: 1, dimension: 'VOLUME' },
  'cu.in': { base: 1.63871e-5, dimension: 'VOLUME' },
  'cu.ft': { base: 0.0283168, dimension: 'VOLUME' },
  gram: { base: 0.001, dimension: 'MASS' },
  kg: { base: 1, dimension: 'MASS' },
  tonne: { base: 1000, dimension: 'MASS' },
  piece: { base: 1, dimension: 'COUNT' },
};

/** Converts a value in the given unit to its SI base. Throws on unknown unit. */
export function toBase(value: number, unit: string): number {
  const entry = CONVERSION_TO_BASE[unit];
  if (!entry) throw new Error(`Unknown unit: ${unit}`);
  return value * entry.base;
}
