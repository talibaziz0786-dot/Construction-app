/**
 * Canonical material aggregation — the ONE place where material quantities coming
 * from different rooms are combined.
 *
 * Rules (deterministic and unit-safe):
 *  - Quantities of the same material category are only merged when their units
 *    share a dimension. Compatible units are converted through the canonical unit
 *    system first; the aggregate is reported in the dimension's base unit.
 *  - Incompatible units (for example cement `piece` = bags vs cement `kg`) are
 *    NEVER merged and NEVER relabelled: they stay as separate lines and carry a
 *    warning explaining why.
 *  - Output order is stable (category, then unit) so the same input always
 *    produces identical output.
 *  - Aggregation carries no pricing: costs and amounts belong to the canonical BOQ
 *    and cost service.
 */
import { SupportedMaterialCategory } from '../project/RateCard.js';
import { CONVERSION_FACTORS, convert } from '../units/conversion';
import { BASE_UNITS, Dimension, Unit } from '../units/types';

/** One material quantity produced by a verified calculator for one context (room). */
export interface MaterialQuantityLine {
  category: SupportedMaterialCategory;
  /** Human-readable material label, e.g. "Standard clay brick". */
  description: string;
  unit: Unit;
  theoreticalQuantity: number;
  procurementQuantity: number;
  wastagePercentage: number;
  sourceCalculatorId: string;
  sourceMethodologyVersion: string;
  /** Context the quantity belongs to (room name). */
  context?: string;
  warnings?: string[];
  assumptions?: string[];
}

/** Aggregated material line across every context it came from. */
export interface AggregatedMaterialLine {
  /** Stable deterministic key: `<category>:<baseUnit>`. */
  id: string;
  category: SupportedMaterialCategory;
  description: string;
  /** Base unit of the aggregated dimension (cu.m, sq.m, kg, piece, …). */
  unit: Unit;
  dimension: Dimension;
  theoreticalQuantity: number;
  procurementQuantity: number;
  /** Effective wastage: (procurement - theoretical) / theoretical × 100. */
  wastagePercentage: number;
  /** How many source lines were merged into this aggregate. */
  lineCount: number;
  /** Every context (room) that contributed, de-duplicated and ordered. */
  contexts: string[];
  /** Calculators that produced the merged quantities. */
  sources: Array<{ calculatorId: string; methodologyVersion: string }>;
  /** Warnings that survived aggregation, de-duplicated and ordered. */
  warnings: string[];
  /** Assumptions that survive aggregation, de-duplicated and ordered. */
  assumptions: string[];
}

function uniqueOrdered(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function effectiveWastage(theoretical: number, procurement: number): number {
  if (!Number.isFinite(theoretical) || theoretical <= 0) return 0;
  return ((procurement - theoretical) / theoretical) * 100;
}

interface MaterialBucket {
  category: SupportedMaterialCategory;
  unit: Unit;
  dimension: Dimension;
  theoretical: number;
  procurement: number;
  descriptions: string[];
  lineCount: number;
  contexts: string[];
  sources: Array<{ calculatorId: string; methodologyVersion: string }>;
  warnings: string[];
  assumptions: string[];
}

/**
 * Aggregates material quantity lines per (category, dimension).
 * Throws only on a malformed line — an unknown unit can never be merged silently,
 * because that is exactly how a kg/bag mix-up would slip through.
 */
export function aggregateMaterialLines(
  lines: readonly MaterialQuantityLine[]
): AggregatedMaterialLine[] {
  const buckets = new Map<string, MaterialBucket>();
  const dimensionsByCategory = new Map<SupportedMaterialCategory, Set<Dimension>>();

  for (const line of lines) {
    const unitData = CONVERSION_FACTORS[line.unit];
    if (!unitData) {
      throw new Error(`Cannot aggregate material ${line.category}: unknown unit "${line.unit}"`);
    }

    const baseUnit = BASE_UNITS[unitData.dimension];
    const key = `${line.category}:${baseUnit}`;
    const theoretical = convert(line.theoreticalQuantity, line.unit, baseUnit);
    const procurement = convert(line.procurementQuantity, line.unit, baseUnit);
    const existing = buckets.get(key);

    if (existing) {
      existing.theoretical += theoretical;
      existing.procurement += procurement;
      existing.lineCount += 1;
      if (!existing.descriptions.includes(line.description)) {
        existing.descriptions.push(line.description);
      }
      if (line.context) existing.contexts.push(line.context);
      existing.sources.push({
        calculatorId: line.sourceCalculatorId,
        methodologyVersion: line.sourceMethodologyVersion,
      });
      existing.warnings.push(...(line.warnings ?? []));
      existing.assumptions.push(...(line.assumptions ?? []));
    } else {
      buckets.set(key, {
        category: line.category,
        unit: baseUnit,
        dimension: unitData.dimension,
        theoretical,
        procurement,
        descriptions: [line.description],
        lineCount: 1,
        contexts: line.context ? [line.context] : [],
        sources: [
          { calculatorId: line.sourceCalculatorId, methodologyVersion: line.sourceMethodologyVersion },
        ],
        warnings: [...(line.warnings ?? [])],
        assumptions: [...(line.assumptions ?? [])],
      });
    }

    const dimensions = dimensionsByCategory.get(line.category) ?? new Set<Dimension>();
    dimensions.add(unitData.dimension);
    dimensionsByCategory.set(line.category, dimensions);
  }

  const aggregated: AggregatedMaterialLine[] = [];
  for (const bucket of buckets.values()) {
    const sources = uniqueOrdered(bucket.sources.map((source) => source.calculatorId)).map(
      (calculatorId) => ({
        calculatorId,
        methodologyVersion:
          bucket.sources.find((source) => source.calculatorId === calculatorId)?.methodologyVersion ??
          'unknown',
      })
    );

    const warnings = [...bucket.warnings];
    const dimensions = dimensionsByCategory.get(bucket.category);
    if (dimensions && dimensions.size > 1) {
      warnings.push(
        `${bucket.category} is reported in more than one unit dimension — lines were never merged` +
          ` (this line is in ${bucket.unit})`
      );
    }

    aggregated.push({
      id: `${bucket.category}:${bucket.unit}`,
      category: bucket.category,
      description: bucket.descriptions[0],
      unit: bucket.unit,
      dimension: bucket.dimension,
      theoreticalQuantity: bucket.theoretical,
      procurementQuantity: bucket.procurement,
      wastagePercentage: effectiveWastage(bucket.theoretical, bucket.procurement),
      lineCount: bucket.lineCount,
      contexts: uniqueOrdered(bucket.contexts),
      sources,
      warnings: uniqueOrdered(warnings),
      assumptions: uniqueOrdered(bucket.assumptions),
    });
  }

  return aggregated.sort((a, b) => {
    if (a.category !== b.category) return a.category < b.category ? -1 : 1;
    if (a.unit === b.unit) return 0;
    return a.unit < b.unit ? -1 : 1;
  });
}
