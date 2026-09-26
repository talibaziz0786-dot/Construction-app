/**
 * Cost Calculation Domain
 * 
 * Handles cost computation from quantities and material rates.
 * Validates unit compatibility before performing calculations.
 */
import { Unit } from './units/types';
import { MaterialRate } from './rates/types';
import { CONVERSION_FACTORS } from './units/conversion';

export interface CostCalculationInput {
  /** The quantity of material needed */
  quantity: number;
  /** Unit of the quantity */
  quantityUnit: Unit;
  /** The material rate to use for cost calculation */
  rate: MaterialRate;
}

/**
 * Result of a cost calculation
 */
export interface CostCalculationResult {
  /** The calculated cost amount */
  amount: number;
  /** Currency of the cost */
  currency: string;
  /** The rate used for calculation */
  rateUsed: MaterialRate;
  /** The quantity used for calculation */
  quantityUsed: number;
  /** Unit of the quantity used */
  quantityUnit: Unit;
  /** Any warnings from the calculation */
  warnings: string[];
}

/**
 * Validates that the quantity unit is compatible with the rate unit
 * Returns the converted rate per quantity unit if compatible
 */
export function validateUnitCompatibility(
  quantityUnit: Unit,
  rate: MaterialRate
): { compatible: boolean; conversionFactor?: number; message?: string } {
  // Get the dimension of the rate unit
  const rateUnit = rate.unit as Unit;
  const quantityUnitData = CONVERSION_FACTORS[quantityUnit];
  const rateUnitData = CONVERSION_FACTORS[rateUnit];

  if (!quantityUnitData || !rateUnitData) {
    return {
      compatible: false,
      message: `Unknown unit: ${quantityUnit} or ${rateUnit}`,
    };
  }

  if (quantityUnitData.dimension !== rateUnitData.dimension) {
    return {
      compatible: false,
      message: `Dimension mismatch: ${quantityUnit} (${quantityUnitData.dimension}) vs ${rateUnit} (${rateUnitData.dimension})`,
    };
  }

  // Calculate conversion factor from rate unit to quantity unit
  const conversionFactor = rateUnitData.base / quantityUnitData.base;
  return { compatible: true, conversionFactor };
}

/**
 * Calculates the cost from quantity and rate
 * Validates unit compatibility before calculation
 */
export function calculateCost(input: CostCalculationInput): CostCalculationResult {
  const { quantity, quantityUnit, rate } = input;
  const warnings: string[] = [];

  // Validate quantity
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`Invalid quantity: ${quantity}. Must be a non-negative finite number.`);
  }

  // Validate rate
  if (!Number.isFinite(rate.amount) || rate.amount < 0) {
    throw new Error(`Invalid rate amount: ${rate.amount}. Must be a non-negative finite number.`);
  }

  // Validate unit compatibility
  const compatibility = validateUnitCompatibility(quantityUnit, rate);
  if (!compatibility.compatible) {
    throw new Error(`Unit incompatibility: ${compatibility.message}`);
  }

  // Calculate cost: quantity * (rate * conversionFactor)
  // If rate is $X per rateUnit and we have Y quantityUnits, cost = Y * X * (rateUnitBase / quantityUnitBase)
  const conversionFactor = compatibility.conversionFactor ?? 1;
  const amount = quantity * rate.amount * conversionFactor;

  return {
    amount,
    currency: rate.currency,
    rateUsed: rate,
    quantityUsed: quantity,
    quantityUnit,
    warnings,
  };
}

/**
 * Calculates costs for multiple materials at once
 */
export function calculateCosts(
  inputs: CostCalculationInput[]
): CostCalculationResult[] {
  return inputs.map((input) => calculateCost(input));
}

/**
 * Aggregates multiple cost calculation results into a total
 */
export function aggregateCosts(results: CostCalculationResult[]): {
  totalAmount: number;
  currency: string;
  byCurrency: Record<string, number>;
} {
  const byCurrency: Record<string, number> = {};

  for (const result of results) {
    if (!byCurrency[result.currency]) {
      byCurrency[result.currency] = 0;
    }
    byCurrency[result.currency] += result.amount;
  }

  // For simplicity, assume single currency (first one)
  const currencies = Object.keys(byCurrency);
  const currency = currencies.length > 0 ? currencies[0] : 'USD';

  return {
    totalAmount: Object.values(byCurrency).reduce((sum, val) => sum + val, 0),
    currency,
    byCurrency,
  };
}