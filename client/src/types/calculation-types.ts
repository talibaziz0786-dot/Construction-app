export interface CostSummaryItem {
  category?: string;
  material: string;
  theoreticalQuantity?: number;
  procurementQuantity?: number;
  quantity?: number;
  unit: string;
  rate: number | null;
  amount?: number | null;
  theoreticalAmount?: number | null;
  procurementAmount?: number | null;
  currency: string;
  missingRate?: boolean;
}

export interface RoomCostSummary {
  roomId: string;
  roomName: string;
  totalCost: number | null;
  currency: string;
  items?: CostSummaryItem[];
  materialCosts?: CostSummaryItem[];
  hasMissingRates?: boolean;
  warnings?: string[];
}

export interface ProjectCostSummary {
  projectId: string;
  projectName: string;
  totalCost?: number | null;
  totalProjectCost?: number | null;
  grandTotal?: number | null;
  currency: string;
  hasMissingRates?: boolean;
  rooms?: RoomCostSummary[];
  roomCostSummaries?: RoomCostSummary[];
  overallMaterialCosts?: CostSummaryItem[];
}

export interface BoqItem {
  id: string;
  /** Material category used to resolve the rate for this line. */
  category: string;
  description: string;
  /** Quantity the amount is based on (the procurement quantity). */
  quantity: number;
  /** Canonical unit of the quantity. */
  unit: string;
  /** Rate per unit, or `null` when no usable rate was configured. */
  rate: number | null;
  currency: string;
  /** `quantity × rate`, or `null` when no rate is available. */
  amount: number | null;
  /** True when no usable rate was configured, so no amount exists. */
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
  /** Sum of the amounts of priced lines only. */
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

export interface RoomSummaryItem {
  roomId: string;
  roomName: string;
  floorAreaSqM: number;
  netWallAreaSqM: number;
  procurementQuantityBricks: number;
}

/** One aggregated material line across every room it came from (server-computed). */
export interface MaterialSummaryLine {
  /** Stable deterministic key: `<category>:<baseUnit>`. */
  id: string;
  category: string;
  description: string;
  /** Base unit of the aggregated dimension (cu.m, sq.m, kg, piece, …). */
  unit: string;
  dimension: string;
  theoreticalQuantity: number;
  procurementQuantity: number;
  /** Effective wastage: (procurement - theoretical) / theoretical × 100. */
  wastagePercentage: number;
  lineCount: number;
  contexts: string[];
  sources: Array<{ calculatorId: string; methodologyVersion: string }>;
  warnings: string[];
  assumptions: string[];
}

/** Deterministic traversal order the server used (building → floor → room). */
export interface ProjectTraversalEntry {
  buildingId: string;
  floorId: string;
  roomId: string;
}

/** Per-room calculator trace returned by the server. */
export interface ProjectCalculationTraceEntry extends ProjectTraversalEntry {
  calculators: string[];
}

/** Duplicate-room / material-line integrity report. */
export interface ProjectIntegrityReport {
  duplicateRoomIds: string[];
  roomCount: number;
  materialLineCount: number;
}

export interface CalculationResultSummary {
  floorAreaSqM: number;
  grossWallAreaSqM?: number;
  openingDeductionSqM?: number;
  netWallAreaSqM: number;
  netMasonryVolumeCuM: number;
  theoreticalBrickQuantity: number;
  procurementAllowanceBricks?: number;
  procurementQuantityBricks: number;
  projectName?: string;
  totalRooms?: number;
  currency?: string;
  roomSummaries?: RoomSummaryItem[];
  materialSummary?: MaterialSummaryLine[];
  traversal?: ProjectTraversalEntry[];
  calculationTrace?: ProjectCalculationTraceEntry[];
  integrity?: ProjectIntegrityReport;
  costSummary?: ProjectCostSummary;
  boq?: Boq;
  warnings: string[];
  methodologyVersion?: string;
  assumptions?: string[];
}