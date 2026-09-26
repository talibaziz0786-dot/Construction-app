import { Calculator } from '../contracts/Calculator.js';

/**
 * Canonical calculator registry.
 *
 * Single source of truth for every calculator the estimation engine can execute.
 * The registry is intentionally heterogeneous: it stores calculators whose input
 * and output contracts differ, so entries are stored type-erased as
 * `Calculator<unknown, unknown>`. Callers that own a calculator's methodology
 * contract read the raw output through the composed-result helpers instead of
 * re-declaring a second, conflicting contract here.
 */
export class CalculatorRegistry {
  private static instance: CalculatorRegistry | undefined;
  private readonly calculators = new Map<string, Calculator<unknown, unknown>>();

  private constructor() {}

  public static getInstance(): CalculatorRegistry {
    if (!CalculatorRegistry.instance) {
      CalculatorRegistry.instance = new CalculatorRegistry();
    }
    return CalculatorRegistry.instance;
  }

  /**
   * Registers a calculator. A duplicate calculator ID is a programming error and
   * is rejected so that two implementations can never silently coexist.
   */
  public register<TInput, TOutput>(calculator: Calculator<TInput, TOutput>): void {
    const { calculatorId } = calculator.identity;
    if (this.calculators.has(calculatorId)) {
      throw new Error(`Calculator ${calculatorId} is already registered.`);
    }
    this.calculators.set(calculatorId, calculator);
  }

  public get(calculatorId: string): Calculator<unknown, unknown> | undefined {
    return this.calculators.get(calculatorId);
  }

  public getAll(): Calculator<unknown, unknown>[] {
    return Array.from(this.calculators.values());
  }

  public getByDomain(domain: string): Calculator<unknown, unknown>[] {
    return this.getAll().filter((calculator) => calculator.identity.domain === domain);
  }

  public has(calculatorId: string): boolean {
    return this.calculators.has(calculatorId);
  }

  public clear(): void {
    this.calculators.clear();
  }
}
