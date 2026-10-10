import {
  Assumption,
  CalculationOutput,
  ResultStatus,
  Warning,
} from '../../contracts/types.js';
import { CalculatorRegistry } from '../../registry/CalculatorRegistry.js';
import { DependencyGraph, DependencyResolutionError } from '../../DependencyGraph.js';
import {
  ComposedCalculationResult,
  ComposedStepRequest,
  ComposedStepResult,
} from './CalculationComposerTypes.js';

/** Version of the composition rules themselves — not of any individual calculator. */
export const COMPOSITION_METHODOLOGY_VERSION = '1.0.0';

export interface CalculationComposerOptions {
  registry: CalculatorRegistry;
  graph: DependencyGraph;
}

/**
 * Canonical composed-calculation executor.
 *
 * Executes an ordered sequence of registered calculators and aggregates their
 * outputs into one traceable result. The composer contains no construction
 * mathematics: it only orchestrates registered calculators and reports failures.
 */
export class CalculationComposer {
  private readonly registry: CalculatorRegistry;
  private readonly graph: DependencyGraph;

  public constructor(options: CalculationComposerOptions) {
    this.registry = options.registry;
    this.graph = options.graph;
  }

  public async composeSteps(
    compositionId: string,
    steps: readonly ComposedStepRequest[],
    context: Record<string, unknown> = {}
  ): Promise<CalculationOutput<ComposedCalculationResult>> {
    if (steps.length === 0) {
      throw new DependencyResolutionError(
        'A composed calculation requires at least one step',
        'EMPTY_COMPOSITION'
      );
    }

    const requestedIds = steps.map((step) => step.calculatorId);
    if (new Set(requestedIds).size !== requestedIds.length) {
      throw new DependencyResolutionError(
        `Composition ${compositionId} contains duplicate calculator steps`,
        'DUPLICATE_STEP'
      );
    }

    this.assertDependencyIntegrity(requestedIds);

    const executedSteps: ComposedStepResult[] = [];

    for (const step of steps) {
      const calculator = this.registry.get(step.calculatorId);
      if (!calculator) {
        throw new DependencyResolutionError(
          `Calculator ${step.calculatorId} is not registered`,
          'UNKNOWN_CALCULATOR'
        );
      }

      const pending: ComposedCalculationResult = {
        compositionId,
        stepCount: executedSteps.length,
        calculatorsUsed: executedSteps.map((executed) => executed.calculatorId),
        steps: executedSteps,
      };

      const data =
        step.input.source === 'value' ? step.input.value : step.input.derive(pending);

      const output = await calculator.calculate({
        calculatorId: step.calculatorId,
        data,
        context,
      });

      executedSteps.push({
        calculatorId: step.calculatorId,
        calculator: output.calculator,
        status: output.status,
        isEstimate: output.isEstimate,
        assumptions: output.assumptions,
        warnings: output.warnings,
        output: output.result,
      });
    }

    const result: ComposedCalculationResult = {
      compositionId,
      stepCount: executedSteps.length,
      calculatorsUsed: executedSteps.map((step) => step.calculatorId),
      steps: executedSteps,
    };

    return {
      calculator: {
        calculatorId: compositionId,
        name: `Composed calculation: ${compositionId}`,
        methodologyVersion: COMPOSITION_METHODOLOGY_VERSION,
        domain: 'composition',
      },
      result,
      status: resolveComposedStatus(executedSteps),
      assumptions: deduplicateAssumptions(executedSteps),
      warnings: deduplicateWarnings(executedSteps),
      trace: {
        calculatorId: compositionId,
        methodologyVersion: COMPOSITION_METHODOLOGY_VERSION,
        timestamp: new Date().toISOString(),
        inputValues: {
          compositionId,
          calculatorsUsed: result.calculatorsUsed,
          contextKeys: Object.keys(context),
        },
      },
      isEstimate: executedSteps.some((step) => step.isEstimate),
    };
  }

  private assertDependencyIntegrity(calculatorIds: readonly string[]): void {
    for (const calculatorId of calculatorIds) {
      if (this.graph.hasCircularDependency(calculatorId)) {
        throw new DependencyResolutionError(
          `Circular dependency detected for calculator ${calculatorId}`,
          'CIRCULAR_DEPENDENCY'
        );
      }
      for (const dependencyId of this.graph.getDependencies(calculatorId)) {
        if (!this.registry.has(dependencyId)) {
          throw new DependencyResolutionError(
            `Calculator ${calculatorId} depends on missing calculator ${dependencyId}`,
            'MISSING_DEPENDENCY'
          );
        }
      }
    }
  }
}

function resolveComposedStatus(steps: readonly ComposedStepResult[]): ResultStatus {
  if (steps.some((step) => step.status === ResultStatus.BLOCKED)) {
    return ResultStatus.BLOCKED;
  }
  if (
    steps.some(
      (step) => step.status === ResultStatus.SUCCESS_WITH_WARNINGS || step.warnings.length > 0
    )
  ) {
    return ResultStatus.SUCCESS_WITH_WARNINGS;
  }
  return ResultStatus.SUCCESS;
}

function deduplicateAssumptions(steps: readonly ComposedStepResult[]): Assumption[] {
  const byId = new Map<string, Assumption>();
  for (const step of steps) {
    for (const assumption of step.assumptions) {
      if (!byId.has(assumption.id)) {
        byId.set(assumption.id, assumption);
      }
    }
  }
  return Array.from(byId.values());
}

function deduplicateWarnings(steps: readonly ComposedStepResult[]): Warning[] {
  const byCode = new Map<string, Warning>();
  for (const step of steps) {
    for (const warning of step.warnings) {
      if (!byCode.has(warning.code)) {
        byCode.set(warning.code, warning);
      }
    }
  }
  return Array.from(byCode.values());
}

/** Finds the executed step for a calculator ID inside a composed result. */
export function findStepResult(
  composed: ComposedCalculationResult,
  calculatorId: string
): ComposedStepResult | undefined {
  return composed.steps.find((step) => step.calculatorId === calculatorId);
}

/**
 * Reads a top-level numeric field from a calculator output payload.
 * Returns `undefined` when the field is absent or is not a finite number.
 */
export function readNumberField(source: unknown, field: string): number | undefined {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const value = (source as Record<string, unknown>)[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Reads a top-level string field from a calculator output payload.
 * Returns `undefined` when the field is absent or is not a string.
 */
export function readStringField(source: unknown, field: string): string | undefined {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const value = (source as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Reads a `Measurement` field (`{ value, unit, dimension }`) from a calculator
 * output payload and returns its value. Returns `undefined` when absent.
 */
export function readMeasurementValue(source: unknown, field: string): number | undefined {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const measurement = (source as Record<string, unknown>)[field];
  return readNumberField(measurement, 'value');
}
