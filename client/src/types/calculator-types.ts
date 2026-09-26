/**
 * Calculator API contracts.
 *
 * Mirrors `server/src/modules/estimation/routes/calculatorRoutes.ts` and
 * `server/src/modules/estimation/catalog/CalculatorCatalog.ts`.
 * The server is authoritative for calculator metadata, validation and results —
 * the client only renders what the API returns.
 */
import type { Boq } from './calculation-types.js';

export type CalculatorCategoryId = 'area' | 'masonry' | 'concrete' | 'finishing';
export type CalculatorStatus = 'available' | 'coming-soon';
export type CalculatorFieldKind = 'measurement' | 'count' | 'percentage' | 'openings';
export type ResultStatus = 'success' | 'success-with-warnings' | 'blocked';

export interface CalculatorInputField {
  name: string;
  label: string;
  kind: CalculatorFieldKind;
  /** Canonical unit the server expects; `null` for counts, percentages and openings. */
  unit: string | null;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** True when the value is a length that may be displayed in ft / cm / mm. */
  isLength: boolean;
  help?: string;
}

export interface CalculatorHubEntry {
  calculatorId: string;
  name: string;
  category: CalculatorCategoryId;
  summary: string;
  status: CalculatorStatus;
  fields: CalculatorInputField[];
}

export interface CalculatorHubCategory {
  id: CalculatorCategoryId;
  name: string;
  summary: string;
  calculators: CalculatorHubEntry[];
}

export interface CalculatorHubResponse {
  categories: CalculatorHubCategory[];
}

export interface CalculatorResultRow {
  label: string;
  value: number;
  unit: string;
}

export interface CalculatorIdentity {
  calculatorId: string;
  name: string;
  methodologyVersion: string;
  domain: string;
}

export interface CalculatorAssumption {
  id: string;
  description: string;
  value?: number | string;
  unit?: string;
  source: string;
  verified: boolean;
}

export interface CalculatorWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CalculatorRateEntryInput {
  category: string;
  item?: string;
  rate: number | null;
  unit: string;
  currency?: string;
  source?: string;
  notes?: string;
}

export interface CalculatorRateCardInput {
  currency: string;
  entries: CalculatorRateEntryInput[];
}

export interface CalculatorRunRequest {
  values: Record<string, unknown>;
  rateCard?: CalculatorRateCardInput;
}

export interface CalculatorRunResponse {
  calculatorId: string;
  name: string;
  calculator: CalculatorIdentity;
  composition: {
    compositionId: string;
    calculatorsUsed: string[];
  };
  status: ResultStatus;
  isEstimate: boolean;
  resultLabel: string;
  primary: CalculatorResultRow;
  rows: CalculatorResultRow[];
  assumptions: CalculatorAssumption[];
  warnings: CalculatorWarning[];
  boq: Boq;
}

/** Values entered through the openings repeater of a calculator form. */
export interface OpeningInputValue {
  type: 'door' | 'window' | 'ventilator' | 'other';
  width: number;
  height: number;
  quantity: number;
}
