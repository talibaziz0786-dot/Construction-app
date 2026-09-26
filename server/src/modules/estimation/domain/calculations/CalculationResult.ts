export interface CalculationResult<T> {
  value: T;
  unit: string;
  calculatorId: string;
  version: string;
  timestamp: string;
  assumptions: string[];
  warnings: string[];
}
