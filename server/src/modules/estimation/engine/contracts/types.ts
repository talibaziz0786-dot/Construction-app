export enum ResultStatus {
  SUCCESS = 'success',
  SUCCESS_WITH_WARNINGS = 'success-with-warnings',
  BLOCKED = 'blocked',
}

export interface Assumption {
  id: string;
  description: string;
  value?: number | string;
  unit?: string;
  source: string;
  verified: boolean;
}

export interface Warning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CalculationTrace {
  calculatorId: string;
  methodologyVersion: string;
  timestamp: string;
  inputValues: Record<string, unknown>;
}

export interface CalculatorIdentity {
  calculatorId: string;
  name: string;
  methodologyVersion: string;
  domain: string;
}

export interface CalculationOutput<T> {
  calculator: CalculatorIdentity;
  result: T;
  status: ResultStatus;
  assumptions: Assumption[];
  warnings: Warning[];
  trace: CalculationTrace;
  isEstimate: boolean;
}

export interface CalculationInput<T> {
  calculatorId: string;
  data: T;
  context: Record<string, unknown>;
}
