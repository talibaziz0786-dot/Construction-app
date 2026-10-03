/**
 * Canonical rate resolution — the ONE place that decides whether a user-entered
 * rate card entry can price a quantity expressed in a required canonical unit.
 *
 * Rules (never invent a price):
 *  - No entry / no rate            -> rate unavailable.
 *  - Rate not a positive amount    -> rate unavailable (with a warning).
 *  - Unit label not understood     -> rate unavailable (with a warning).
 *  - Unit of a different dimension -> rate unavailable (with a warning). A kg rate
 *                                     can never price a bag count.
 *  - Same dimension, other unit    -> a REAL conversion through the canonical
 *                                     unit system (e.g. per cu.ft -> per cu.m).
 *
 * There is exactly one implementation of these rules: the quick-calculator route
 * and the project cost/BOQ service both consume it.
 */
import { CONVERSION_FACTORS, convert } from '../units/conversion';
import { normalizeUnitLabel } from '../units/labels';
import { Unit } from '../units/types';

/** Minimal shape needed from a rate card entry. */
export interface RateCandidate {
  category: string;
  rate: number | null;
  unit: string;
}

export interface ResolvedRate {
  /** Rate expressed **per `requiredUnit`**, or `null` when it cannot be used. */
  rate: number | null;
  /** Explains why no rate was produced, or that a currency-safe conversion happened. */
  warning?: string;
  /** Unit the user actually entered, when a conversion was applied. */
  convertedFromUnit?: string;
}

/**
 * Resolves a rate entry against the canonical unit of the quantity it should price.
 * Returns `rate: null` plus a human-readable warning whenever no honest price exists.
 */
export function resolveRateForUnit(
  entry: RateCandidate | undefined,
  requiredUnit: Unit
): ResolvedRate {
  if (!entry || entry.rate === null) {
    return { rate: null };
  }

  if (!Number.isFinite(entry.rate) || entry.rate <= 0) {
    return { rate: null, warning: `Configured ${entry.category} rate is not a valid positive amount` };
  }

  const normalizedUnit = normalizeUnitLabel(entry.unit);
  if (normalizedUnit === null) {
    return {
      rate: null,
      warning: `Configured ${entry.category} rate uses an unrecognised unit "${entry.unit}"`,
    };
  }

  if (normalizedUnit === requiredUnit) {
    return { rate: entry.rate };
  }

  const fromData = CONVERSION_FACTORS[normalizedUnit];
  const toData = CONVERSION_FACTORS[requiredUnit];
  if (!fromData || !toData || fromData.dimension !== toData.dimension) {
    return {
      rate: null,
      warning: `Configured ${entry.category} rate is per "${entry.unit}", which does not match the required unit "${requiredUnit}"`,
    };
  }

  // Real conversion: `convert(1, from, to)` is how many `to` units one `from` unit
  // holds, so a price per `from` unit becomes `rate / that` per `to` unit.
  const unitsPerFrom = convert(1, normalizedUnit, requiredUnit);
  if (!Number.isFinite(unitsPerFrom) || unitsPerFrom <= 0) {
    return {
      rate: null,
      warning: `Configured ${entry.category} rate could not be converted from "${entry.unit}" to "${requiredUnit}"`,
    };
  }

  const convertedRate = entry.rate / unitsPerFrom;

  return {
    rate: convertedRate,
    convertedFromUnit: entry.unit,
    warning: `Configured ${entry.category} rate of ${entry.rate} per "${entry.unit}" was converted to ${convertedRate} per "${requiredUnit}"`,
  };
}
