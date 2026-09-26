/**
 * Bill of Quantities (BOQ) Domain — the single canonical BOQ model.
 *
 * A BOQ line is traceable to the calculator and methodology version that produced
 * its quantity. Rates are never invented: when no rate is configured for a line
 * the line is marked `rateUnavailable` and both `rate` and `amount` are `null`.
 */
import { Unit } from './units/types';
import { SupportedMaterialCategory } from './project/RateCard';

/** A priced or unpriced line of the bill of quantities. */
export interface BoqItem {
  /** Stable identifier of this line inside its section. */
  id: string;
  /** Material category, used to resolve the rate for this line. */
  category: SupportedMaterialCategory;
  /** Human-readable line description. */
  description: string;
  /** Quantity the amount is based on (the procurement quantity). */
  quantity: number;
  /** Canonical unit of `quantity`. */
  unit: Unit;
  /** Rate per unit, or `null` when no usable rate was configured. */
  rate: number | null;
  /** Currency of `rate` and `amount`. */
  currency: string;
  /** `quantity × rate`, or `null` when the rate is unavailable. */
  amount: number | null;
  /** True when no usable rate was configured, so no amount exists. */
  rateUnavailable: boolean;
  /** Theoretical quantity before the wastage allowance. */
  theoreticalQuantity: number;
  /** Procurement quantity including the wastage allowance. */
  procurementQuantity: number;
  /** Wastage percentage applied to arrive at the procurement quantity. */
  wastagePercentage: number;
  /** Calculator that produced the quantity. */
  sourceCalculatorId: string;
  /** Methodology version of that calculator. */
  sourceMethodologyVersion: string;
  /** Optional context label (room name, wall, element, …). */
  context?: string;
  /** Assumptions that apply to this line. */
  assumptions: string[];
  /** Warnings that apply to this line. */
  warnings: string[];
}

export interface BoqSection {
  /** Section identifier (room / element / calculation). */
  id: string;
  /** Section display name. */
  name: string;
  /** Lines of this section. */
  items: BoqItem[];
  /** Sum of the amounts of priced lines only. */
  totalAmount: number;
  /** Currency of the amounts. */
  currency: string;
  /** Number of lines without a usable rate. */
  rateUnavailableCount: number;
}

/** Complete BOQ for a project or for a single quick calculation. */
export interface Boq {
  /** Project or calculation identifier this BOQ belongs to. */
  projectId: string;
  /** Project or calculation display name. */
  projectName: string;
  /** All sections of the BOQ. */
  sections: BoqSection[];
  /** Grand total across priced lines of all sections. */
  grandTotal: number;
  /** Currency of the amounts. */
  currency: string;
  /** Generation timestamp. */
  generatedAt: string;
  /** Project level assumptions. */
  assumptions: string[];
  /** Project level warnings. */
  warnings: string[];
  /** True when at least one line has no usable rate. */
  hasMissingRates: boolean;
}

/** Input required to create a BOQ line. */
export interface BoqItemInput {
  id: string;
  category: SupportedMaterialCategory;
  description: string;
  quantity: number;
  unit: Unit;
  rate: number | null;
  currency: string;
  theoreticalQuantity: number;
  procurementQuantity: number;
  wastagePercentage: number;
  sourceCalculatorId: string;
  sourceMethodologyVersion: string;
  context?: string;
  assumptions?: string[];
  warnings?: string[];
}

/**
 * Creates a BOQ line. A rate is considered usable only when it is a finite,
 * strictly positive number — anything else marks the line as rate-unavailable
 * instead of silently pricing it at zero.
 */
export function createBoqItem(input: BoqItemInput): BoqItem {
  const warnings = [...(input.warnings ?? [])];
  const hasUsableRate =
    input.rate !== null && Number.isFinite(input.rate) && input.rate > 0;

  if (!hasUsableRate) {
    warnings.push('Rate unavailable — amount not calculated');
  }

  const rate = hasUsableRate ? input.rate : null;

  return {
    id: input.id,
    category: input.category,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit,
    rate,
    currency: input.currency,
    amount: rate === null ? null : input.quantity * rate,
    rateUnavailable: rate === null,
    theoreticalQuantity: input.theoreticalQuantity,
    procurementQuantity: input.procurementQuantity,
    wastagePercentage: input.wastagePercentage,
    sourceCalculatorId: input.sourceCalculatorId,
    sourceMethodologyVersion: input.sourceMethodologyVersion,
    context: input.context,
    assumptions: input.assumptions ?? [],
    warnings,
  };
}

/** Creates a section and derives its priced total. */
export function createBoqSection(input: {
  id: string;
  name: string;
  items: BoqItem[];
  currency: string;
}): BoqSection {
  const totalAmount = input.items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const rateUnavailableCount = input.items.filter((item) => item.rateUnavailable).length;

  return {
    id: input.id,
    name: input.name,
    items: input.items,
    totalAmount,
    currency: input.currency,
    rateUnavailableCount,
  };
}

/**
 * Builder for assembling a BOQ from sections, assumptions and warnings.
 * Totals are always derived from the section items — never passed in.
 */
export class BoqBuilder {
  private readonly sections: BoqSection[] = [];
  private readonly assumptions: string[] = [];
  private readonly warnings: string[] = [];

  public addSection(section: BoqSection): void {
    if (this.sections.some((existing) => existing.id === section.id)) {
      throw new Error(`BOQ section ${section.id} already exists`);
    }
    this.sections.push(section);
  }

  public addAssumption(assumption: string): void {
    if (!this.assumptions.includes(assumption)) {
      this.assumptions.push(assumption);
    }
  }

  public addWarning(warning: string): void {
    if (!this.warnings.includes(warning)) {
      this.warnings.push(warning);
    }
  }

  public build(projectId: string, projectName: string, currency: string): Boq {
    const grandTotal = this.sections.reduce((sum, section) => sum + section.totalAmount, 0);
    const hasMissingRates = this.sections.some((section) => section.rateUnavailableCount > 0);

    return {
      projectId,
      projectName,
      sections: [...this.sections],
      grandTotal,
      currency,
      generatedAt: new Date().toISOString(),
      assumptions: [...this.assumptions],
      warnings: [...this.warnings],
      hasMissingRates,
    };
  }
}

