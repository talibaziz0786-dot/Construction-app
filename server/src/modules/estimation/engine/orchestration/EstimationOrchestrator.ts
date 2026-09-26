import { CalculationOutput } from '../contracts/types.js';
import { Calculator } from '../contracts/Calculator.js';
import { CalculationComposer } from '../core/composition/CalculationComposer.js';
import {
  ComposedCalculationResult,
  ComposedStepRequest,
} from '../core/composition/CalculationComposerTypes.js';
import { CalculatorRegistry } from '../registry/CalculatorRegistry.js';
import { DependencyGraph, DependencyValidationResult } from '../DependencyGraph.js';

/**
 * Application-facing entry point of the estimation engine.
 *
 * Owns the single canonical registry, the dependency graph and the composer, so
 * routes never wire engine internals themselves. All construction mathematics is
 * executed here — never in routes, models or React components.
 */
export class EstimationOrchestrator {
  private static instance: EstimationOrchestrator | undefined;
  private readonly registry: CalculatorRegistry;
  private readonly graph: DependencyGraph;
  private readonly composer: CalculationComposer;

  private constructor() {
    this.registry = CalculatorRegistry.getInstance();
    this.graph = new DependencyGraph();
    this.composer = new CalculationComposer({ registry: this.registry, graph: this.graph });
  }

  public static getInstance(): EstimationOrchestrator {
    if (!EstimationOrchestrator.instance) {
      EstimationOrchestrator.instance = new EstimationOrchestrator();
    }
    return EstimationOrchestrator.instance;
  }

  public registerCalculator<TInput, TOutput>(calculator: Calculator<TInput, TOutput>): void {
    this.registry.register(calculator);
    this.graph.addCalculator(calculator.identity.calculatorId);
  }

  public getCalculator(calculatorId: string): Calculator<unknown, unknown> | undefined {
    return this.registry.get(calculatorId);
  }

  public getAllCalculators(): Calculator<unknown, unknown>[] {
    return this.registry.getAll();
  }

  public getCalculatorsByDomain(domain: string): Calculator<unknown, unknown>[] {
    return this.registry.getByDomain(domain);
  }

  public hasCalculator(calculatorId: string): boolean {
    return this.registry.has(calculatorId);
  }

  /** Declares that `calculatorId` consumes a result produced by `dependencyId`. */
  public declareDependency(calculatorId: string, dependencyId: string): void {
    this.graph.addDependency(calculatorId, dependencyId);
  }

  public getDependencies(calculatorId: string): string[] {
    return this.graph.getDependencies(calculatorId);
  }

  /** Validates that every declared dependency exists and that no cycle exists. */
  public validateDependencyGraph(): DependencyValidationResult {
    return this.graph.validateGraph();
  }

  /**
   * Executes an ordered composition of registered calculators and returns the
   * aggregated, traceable result. `compositionId` identifies the composition run.
   */
  public async composeSteps(
    compositionId: string,
    steps: readonly ComposedStepRequest[],
    context: Record<string, unknown> = {}
  ): Promise<CalculationOutput<ComposedCalculationResult>> {
    return this.composer.composeSteps(compositionId, steps, context);
  }
}
