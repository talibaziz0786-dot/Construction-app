/**
 * Calculator API contracts for the mobile client.
 *
 * Mirrors `server/src/modules/estimation/routes/calculatorRoutes.ts` and
 * `server/src/modules/estimation/catalog/CalculatorCatalog.ts` — the same
 * server contract the web client mirrors in `client/src/types/calculator-types.ts`.
 *
 * The server is authoritative for calculator metadata, validation and results.
 * The mobile app only renders what the API returns and never computes
 * construction quantities locally.
 */

export type CalculatorCategoryId = 'area' | 'masonry' | 'concrete' | 'finishing';
export type CalculatorStatus = 'available' | 'coming-soon';
export type CalculatorFieldKind = 'measurement' | 'count' | 'percentage' | 'openings';
export type ResultStatus = 'success' | 'success-with-warnings' | 'blocked';
export type OpeningType = 'door' | 'window' | 'ventilator' | 'other';

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
  /** True when the value is a length (displayed in the field's canonical unit). */
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

/** Values entered through the openings repeater of a calculator form. */
export interface OpeningInputValue {
  type: OpeningType;
  width: number;
  height: number;
  quantity: number;
}

export interface CalculatorRunRequest {
  values: Record<string, unknown>;
  // Rate cards (priced BOQ) are a web-client feature for now; the mobile MVP
  // requests quantities only and the server defaults to an empty rate card.
}

export interface BoqItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | null;
  currency: string;
  amount: number | null;
  rateUnavailable: boolean;
  theoreticalQuantity: number;
  procurementQuantity: number;
  wastagePercentage: number;
  sourceCalculatorId: string;
  sourceMethodologyVersion: string;
  context?: string;
  assumptions: string[];
  warnings: string[];
}

export interface BoqSection {
  id: string;
  name: string;
  items: BoqItem[];
  totalAmount: number;
  currency: string;
  rateUnavailableCount: number;
}

export interface Boq {
  projectId: string;
  projectName: string;
  sections: BoqSection[];
  grandTotal: number;
  currency: string;
  generatedAt: string;
  assumptions: string[];
  warnings: string[];
  hasMissingRates: boolean;
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
