/**
 * Project Rate Card Domain
 * 
 * A RateCard is a project-level collection of material rates that can be configured
 * by the user. Each project has its own RateCard to allow for different pricing
 * based on location, supplier, or other factors.
 */
import { MaterialRate } from '../rates/types';

/**
 * Supported material categories that can have rates.
 *
 * The runtime list is the single source of truth and the type is derived from it,
 * so validation enums, persistence and domain types can never drift apart.
 */
export const SUPPORTED_MATERIAL_CATEGORIES = [
  'aggregate',
  'adhesive',
  'brick',
  'block',
  'steel',
  'tile',
  'grout',
  'paint',
  'primer',
  'putty',
  'waterproofing',
  'pipe',
  'fitting',
  'electrical',
  'door',
  'window',
  'hardware',
  'other',
  'cement',
  'concrete',
  'sand',
  'plaster',
] as const;

export type SupportedMaterialCategory = (typeof SUPPORTED_MATERIAL_CATEGORIES)[number];

/** Runtime guard for API supplied category strings. */
export function isSupportedMaterialCategory(value: string): value is SupportedMaterialCategory {
  return (SUPPORTED_MATERIAL_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Material rate entry for a rate card
 */
export interface RateCardEntry {
  /** Material category used to resolve this rate for a BOQ line */
  category: SupportedMaterialCategory;
  /** Specific item / material label (brand, grade, supplier item name) */
  item?: string;
  /** User-entered rate amount, or `null` when not configured */
  rate: number | null;
  /** Unit of the rate (piece, bag, cu.m, kg, …) */
  unit: string;
  /** Currency code */
  currency: string;
  /** Optional source/notes */
  source?: string;
  /** Optional location context */
  location?: string;
  /** Optional free-form notes about the rate */
  notes?: string;
  /** When this rate was last updated (also acts as the rate version) */
  updatedAt?: string;
}

/**
 * RateCard for a project - stores configured material rates
 */
export interface RateCard {
  /** Project ID this rate card belongs to */
  projectId: string;
  /** All rate entries */
  entries: RateCardEntry[];
  /** Default currency */
  currency: string;
  /** When the rate card was created */
  createdAt: string;
  /** When it was last updated */
  updatedAt: string;
}

/**
 * Creates a default empty rate card for a project
 */
export function createEmptyRateCard(projectId: string, currency: string = 'USD'): RateCard {
  const now = new Date().toISOString();
  return {
    projectId,
    currency,
    createdAt: now,
    updatedAt: now,
    entries: [],
  };
}

/**
 * Default supported materials for brick-based estimation
 */
export const DEFAULT_SUPPORTED_MATERIALS: SupportedMaterialCategory[] = [
  'aggregate',
  'adhesive',
  'brick',
  'cement',
  'concrete',
  'grout',
  'plaster',
  'sand',
  'steel',
  'tile',
];

/**
 * Get a rate from a rate card by category
 */
export function getRateFromCard(
  card: RateCard,
  category: SupportedMaterialCategory
): RateCardEntry | undefined {
  return card.entries.find((e) => e.category === category);
}

/**
 * Check if a rate card has all required rates for a calculation
 */
export function checkMissingRates(
  card: RateCard,
  requiredCategories: SupportedMaterialCategory[]
): SupportedMaterialCategory[] {
  return requiredCategories.filter((cat) => {
    const entry = getRateFromCard(card, cat);
    return !entry || entry.rate === null;
  });
}

/**
 * Convert a RateCardEntry to a MaterialRate for cost calculation
 */
export function toMaterialRate(entry: RateCardEntry): MaterialRate | null {
  if (entry.rate === null) {
    return null;
  }

  return {
    id: `rate-${entry.category}`,
    materialId: entry.category,
    amount: entry.rate,
    currency: entry.currency,
    unit: entry.unit,
    source: 'user-entered',
    context: {
      location: entry.location ?? 'unspecified',
      date: new Date(),
    },
    effectiveFrom: new Date(),
  };
}