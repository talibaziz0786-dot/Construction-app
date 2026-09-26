/**
 * Cost Calculator Service
 *
 * Integrates verified quantity calculations with rate cards to produce material
 * costs and canonical BOQ entries. This is the authoritative source for all cost
 * calculations — the client never calculates costs independently.
 *
 * Rates are user-entered. When a rate is missing the affected amount is `null`,
 * the BOQ line is marked rate-unavailable, and the total only ever sums priced
 * lines. Market prices are never invented.
 */
import { RateCard, RateCardEntry, SupportedMaterialCategory, getRateFromCard } from '../domain/project/RateCard';
import { Boq, BoqBuilder, createBoqItem, createBoqSection } from '../domain/boq';
import { Unit } from '../domain/units/types';
import { EstimationOrchestrator } from '../engine/orchestration/EstimationOrchestrator';

export interface RoomCalculationResult {
  roomId: string;
  roomName: string;
  floorAreaSqM: number;
  netWallAreaSqM: number;
  netMasonryVolumeCuM: number;
  theoreticalBrickQuantity: number;
  procurementQuantityBricks: number;
  /** Wastage percentage applied to the brick procurement quantity. */
  wastagePercentage?: number;
  concreteVolumeCuM?: number;
  procurementVolumeConcreteCuM?: number;
  plasterVolumeCuM?: number;
  procurementVolumePlasterCuM?: number;
  theoreticalTileCount?: number;
  procurementTileCount?: number;
}

export interface MaterialCostItem {
  category: SupportedMaterialCategory;
  material: string;
  theoreticalQuantity: number;
  procurementQuantity: number;
  /** Unit of the configured rate, exactly as the user entered it. */
  unit: string;
  /** Canonical unit of the quantity, used for BOQ lines. */
  boqUnit: Unit;
  /** Calculator that produced the quantity (BOQ traceability). */
  sourceCalculatorId: string;
  rate: number | null;
  currency: string;
  theoreticalAmount: number | null;
  procurementAmount: number | null;
  missingRate: boolean;
}

export interface RoomCostSummary {
  roomId: string;
  roomName: string;
  items: MaterialCostItem[];
  /** Sum of priced lines only; `null` when nothing could be priced. */
  totalCost: number | null;
  currency: string;
  hasMissingRates: boolean;
  warnings: string[];
}

export interface ProjectCostSummary {
  projectId: string;
  projectName: string;
  currency: string;
  rooms: RoomCostSummary[];
  /** Sum of priced lines of all rooms; `null` when nothing could be priced. */
  totalCost: number | null;
  hasMissingRates: boolean;
  grandTotal: number | null;
}

export interface CostCalculationOptions {
  rateCard: RateCard;
  currency: string;
}

interface ResolvedRate {
  entry: RateCardEntry | undefined;
  /** Usable (finite, strictly positive) rate, or `null` when unavailable. */
  rate: number | null;
  unit: string;
}

/**
 * Resolves the rate for a material category. A rate is usable only when it is a
 * finite, strictly positive number — zero or invalid values are treated as
 * "not configured" so a price is never silently invented.
 */
function resolveRate(
  rateCard: RateCard,
  category: SupportedMaterialCategory,
  fallbackUnit: string
): ResolvedRate {
  const entry = getRateFromCard(rateCard, category);
  const rawRate = entry?.rate ?? null;
  const rate = rawRate !== null && Number.isFinite(rawRate) && rawRate > 0 ? rawRate : null;
  return { entry, rate, unit: entry?.unit ?? fallbackUnit };
}

/** Calculates an amount from a quantity and a resolved rate. */
function amountFor(quantity: number | undefined, rate: number | null): number | null {
  if (rate === null || quantity === undefined) {
    return null;
  }
  return quantity * rate;
}

/**
 * Calculates material costs for a single room from its calculation results.
 */
export function calculateRoomCosts(
  roomResult: RoomCalculationResult,
  options: CostCalculationOptions
): RoomCostSummary {
  const { rateCard, currency } = options;
  const items: MaterialCostItem[] = [];
  const warnings: string[] = [];

  const register = (line: {
    category: SupportedMaterialCategory;
    fallbackName: string;
    fallbackUnit: string;
    boqUnit: Unit;
    sourceCalculatorId: string;
    theoreticalQuantity: number;
    procurementQuantity: number;
  }): number => {
    const resolved = resolveRate(rateCard, line.category, line.fallbackUnit);
    const procurementAmount = amountFor(line.procurementQuantity, resolved.rate);

    items.push({
      category: line.category,
      material: resolved.entry?.item ?? line.fallbackName,
      theoreticalQuantity: line.theoreticalQuantity,
      procurementQuantity: line.procurementQuantity,
      unit: resolved.unit,
      boqUnit: line.boqUnit,
      sourceCalculatorId: line.sourceCalculatorId,
      rate: resolved.rate,
      currency,
      theoreticalAmount: amountFor(line.theoreticalQuantity, resolved.rate),
      procurementAmount,
      missingRate: resolved.rate === null,
    });

    if (resolved.rate === null) {
      warnings.push(`${line.fallbackName} rate not configured — cost cannot be calculated`);
    }

    return procurementAmount ?? 0;
  };

  let pricedTotal = 0;

  pricedTotal += register({
    category: 'brick',
    fallbackName: 'Standard clay brick',
    fallbackUnit: 'nos',
    boqUnit: Unit.PIECE,
    sourceCalculatorId: 'masonry.brick-quantity',
    theoreticalQuantity: roomResult.theoreticalBrickQuantity,
    procurementQuantity: roomResult.procurementQuantityBricks,
  });

  if (roomResult.concreteVolumeCuM !== undefined) {
    pricedTotal += register({
      category: 'concrete',
      fallbackName: 'Ready-mix concrete',
      fallbackUnit: 'cu.m',
      boqUnit: Unit.CU_M,
      sourceCalculatorId: 'concrete.volume',
      theoreticalQuantity: roomResult.concreteVolumeCuM,
      procurementQuantity: roomResult.procurementVolumeConcreteCuM ?? 0,
    });
  }

  if (roomResult.plasterVolumeCuM !== undefined) {
    pricedTotal += register({
      category: 'plaster',
      fallbackName: 'Cement plaster',
      fallbackUnit: 'cu.m',
      boqUnit: Unit.CU_M,
      sourceCalculatorId: 'plaster.quantity',
      theoreticalQuantity: roomResult.plasterVolumeCuM,
      procurementQuantity: roomResult.procurementVolumePlasterCuM ?? 0,
    });
  }

  if (roomResult.theoreticalTileCount !== undefined) {
    pricedTotal += register({
      category: 'tile',
      fallbackName: 'Floor tiles',
      fallbackUnit: 'nos',
      boqUnit: Unit.PIECE,
      sourceCalculatorId: 'tile.quantity',
      theoreticalQuantity: roomResult.theoreticalTileCount,
      procurementQuantity: roomResult.procurementTileCount ?? 0,
    });
  }

  return {
    roomId: roomResult.roomId,
    roomName: roomResult.roomName,
    items,
    totalCost: items.some((item) => item.procurementAmount !== null) ? pricedTotal : null,
    currency,
    hasMissingRates: items.some((item) => item.missingRate),
    warnings,
  };
}

/**
 * Aggregates room costs into a project-level summary.
 * Totals sum priced lines only. `hasMissingRates` signals that a total is
 * incomplete because one or more rates were not configured.
 */
export function aggregateProjectCosts(
  projectId: string,
  projectName: string,
  roomCosts: RoomCostSummary[],
  currency: string
): ProjectCostSummary {
  const totalCost = roomCosts.some((room) => room.totalCost !== null)
    ? roomCosts.reduce((sum, room) => sum + (room.totalCost ?? 0), 0)
    : null;

  return {
    projectId,
    projectName,
    currency,
    rooms: roomCosts,
    totalCost,
    hasMissingRates: roomCosts.some((room) => room.hasMissingRates),
    grandTotal: totalCost,
  };
}

/** Reads the methodology version of a registered calculator (BOQ traceability). */
function methodologyVersionOf(calculatorId: string): string {
  const calculator = EstimationOrchestrator.getInstance().getCalculator(calculatorId);
  if (!calculator) {
    throw new Error(`Calculator ${calculatorId} is not registered`);
  }
  return calculator.identity.methodologyVersion;
}

/**
 * Generates the canonical Bill of Quantities from room calculation results.
 *
 * Lines are derived from the same priced cost items used for the room cost
 * summary, so the BOQ and the cost summary can never contradict each other.
 */
export function generateBoq(
  projectId: string,
  projectName: string,
  roomResults: RoomCalculationResult[],
  options: CostCalculationOptions
): Boq {
  const { currency } = options;
  const builder = new BoqBuilder();

  builder.addAssumption('Quantities are produced by verified server-side calculators.');
  builder.addAssumption('Costs are based on user-entered material rates.');
  builder.addAssumption('Procurement quantities include the wastage allowance.');
  builder.addAssumption('These estimates are for planning purposes only.');

  for (const roomResult of roomResults) {
    const roomCosts = calculateRoomCosts(roomResult, options);

    const items = roomCosts.items.map((item) =>
      createBoqItem({
        id: `${item.category}-${roomResult.roomId}`,
        category: item.category,
        description: `${item.material} (${roomResult.roomName})`,
        quantity: item.procurementQuantity,
        unit: item.boqUnit,
        rate: item.rate,
        currency: item.currency,
        theoreticalQuantity: item.theoreticalQuantity,
        procurementQuantity: item.procurementQuantity,
        wastagePercentage: roomResult.wastagePercentage ?? 0,
        sourceCalculatorId: item.sourceCalculatorId,
        sourceMethodologyVersion: methodologyVersionOf(item.sourceCalculatorId),
        context: roomResult.roomName,
      })
    );

    for (const warning of roomCosts.warnings) {
      builder.addWarning(`[${roomResult.roomName}] ${warning}`);
    }

    builder.addSection(
      createBoqSection({
        id: roomResult.roomId,
        name: roomResult.roomName,
        items,
        currency,
      })
    );
  }

  return builder.build(projectId, projectName, currency);
}
