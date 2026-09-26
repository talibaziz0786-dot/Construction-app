import type { LengthUnit, AreaUnit, VolumeUnit } from '../types/unit-types.js';

export const METERS_PER_UNIT: Record<LengthUnit, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
};

export const SQ_METERS_PER_UNIT: Record<AreaUnit, number> = {
  'sq.m': 1,
  'sq.ft': 0.09290304,
  'sq.in': 0.00064516,
};

export const CU_METERS_PER_UNIT: Record<VolumeUnit, number> = {
  'cu.m': 1,
  'cu.ft': 0.028316846592,
};

/**
 * Rounds a number to a specific number of decimal places.
 */
export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const multiplier = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * Converts any supported length value to canonical meters.
 */
export function toMeters(value: number, from: LengthUnit): number {
  if (!Number.isFinite(value)) return 0;
  const factor = METERS_PER_UNIT[from];
  return value * factor;
}

/**
 * Converts meters to the target length unit.
 */
export function fromMeters(meters: number, to: LengthUnit, decimals?: number): number {
  if (!Number.isFinite(meters)) return 0;
  const factor = METERS_PER_UNIT[to];
  const result = meters / factor;
  return decimals !== undefined ? roundTo(result, decimals) : result;
}

/**
 * Converts any supported area value to canonical square meters.
 */
export function toSqMeters(value: number, from: AreaUnit): number {
  if (!Number.isFinite(value)) return 0;
  const factor = SQ_METERS_PER_UNIT[from];
  return value * factor;
}

/**
 * Converts square meters to target area unit.
 */
export function fromSqMeters(sqMeters: number, to: AreaUnit, decimals?: number): number {
  if (!Number.isFinite(sqMeters)) return 0;
  const factor = SQ_METERS_PER_UNIT[to];
  const result = sqMeters / factor;
  return decimals !== undefined ? roundTo(result, decimals) : result;
}

/**
 * Converts any supported volume value to canonical cubic meters.
 */
export function toCuMeters(value: number, from: VolumeUnit): number {
  if (!Number.isFinite(value)) return 0;
  const factor = CU_METERS_PER_UNIT[from];
  return value * factor;
}

/**
 * Converts cubic meters to target volume unit.
 */
export function fromCuMeters(cuMeters: number, to: VolumeUnit, decimals?: number): number {
  if (!Number.isFinite(cuMeters)) return 0;
  const factor = CU_METERS_PER_UNIT[to];
  const result = cuMeters / factor;
  return decimals !== undefined ? roundTo(result, decimals) : result;
}

/**
 * Discrete quantity formatting for bricks / items (never treated as length/area/volume).
 */
export function formatCount(count: number): string {
  if (!Number.isFinite(count)) return '0';
  return Math.ceil(count).toLocaleString();
}
