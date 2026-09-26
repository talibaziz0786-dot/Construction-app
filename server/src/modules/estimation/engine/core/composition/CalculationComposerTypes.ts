import {
  Assumption,
  CalculatorIdentity,
  ResultStatus,
  Warning,
} from '../../contracts/types.js';

/**
 * Input of a single calculator invocation inside a composed calculation.
 *
 * - `value` passes data that is already validated and expressed in canonical SI units.
 * - `derived` builds the input from results of the steps executed so far, which is
 *   how a later calculator consumes an earlier calculator's verified output.
 */
export type ComposedStepInput =
  | { readonly source: 'value'; readonly value: unknown }
  | {
      readonly source: 'derived';
      readonly derive: (previous: ComposedCalculationResult) => unknown;
    };

export interface ComposedStepRequest {
  calculatorId: string;
  input: ComposedStepInput;
}

/**
 * Result of one executed step of a composition.
 *
 * `output` is the raw calculator payload and is intentionally `unknown`: each
 * calculator owns its own output contract. Read it with `readNumberField` /
 * `readMeasurementValue` exported by the composer, or interpret it inside the
 * module that owns that methodology.
 */
export interface ComposedStepResult {
  calculatorId: string;
  calculator: CalculatorIdentity;
  status: ResultStatus;
  isEstimate: boolean;
  assumptions: Assumption[];
  warnings: Warning[];
  output: unknown;
}

/** Aggregated output of a composed (multi-step) calculation. */
export interface ComposedCalculationResult {
  compositionId: string;
  stepCount: number;
  calculatorsUsed: string[];
  steps: ComposedStepResult[];
}
