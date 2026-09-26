import { CalculationInput, CalculationOutput } from './types.js';

export interface Calculator<TInput, TOutput> {
  identity: {
    calculatorId: string;
    name: string;
    methodologyVersion: string;
    domain: string;
  };
  calculate(input: CalculationInput<TInput>): Promise<CalculationOutput<TOutput>>;
}
