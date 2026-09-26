import { CalculationOutput } from './contracts/types.js';

export interface ResultReference {
  calculatorId: string;
  methodologyVersion: string;
  calculationId: string;
  resultPath?: string;
}

export interface Dependency {
  calculatorId: string;
  methodologyVersion?: string;
  description?: string;
}

export interface DependencyValidationResult {
  isValid: boolean;
  errors: DependencyError[];
}

export interface DependencyError {
  code: string;
  message: string;
  dependencyId?: string;
}

export class DependencyResolutionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DependencyResolutionError';
  }
}

export class DependencyGraph {
  private dependencies = new Map<string, Set<string>>();
  private resultReferences = new Map<string, ResultReference[]>();

  public addCalculator(calculatorId: string): void {
    if (!this.dependencies.has(calculatorId)) {
      this.dependencies.set(calculatorId, new Set());
    }
  }

  public addDependency(calculatorId: string, dependencyId: string): void {
    this.addCalculator(calculatorId);
    this.addCalculator(dependencyId);
    this.dependencies.get(calculatorId)?.add(dependencyId);
  }

  public getDependencies(calculatorId: string): string[] {
    return Array.from(this.dependencies.get(calculatorId) || []);
  }

  public hasDependency(calculatorId: string, dependencyId: string): boolean {
    return this.dependencies.get(calculatorId)?.has(dependencyId) || false;
  }

  public addResultReference(calculationId: string, reference: ResultReference): void {
    if (!this.resultReferences.has(calculationId)) {
      this.resultReferences.set(calculationId, []);
    }
    this.resultReferences.get(calculationId)?.push(reference);
  }

  public getResultReferences(calculationId: string): ResultReference[] {
    return Array.from(this.resultReferences.get(calculationId) || []);
  }

  public hasCircularDependency(calculatorId: string): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();
    
    const dfs = (currentId: string): boolean => {
      if (stack.has(currentId)) {
        return true;
      }
      if (visited.has(currentId)) {
        return false;
      }
      
      visited.add(currentId);
      stack.add(currentId);
      
      const dependencies = this.getDependencies(currentId);
      for (const depId of dependencies) {
        if (dfs(depId)) {
          return true;
        }
      }
      
      stack.delete(currentId);
      return false;
    };
    
    return dfs(calculatorId);
  }

  public validateGraph(): DependencyValidationResult {
    const errors: DependencyError[] = [];
    
    for (const [calculatorId, dependencies] of this.dependencies.entries()) {
      for (const dependencyId of dependencies) {
        if (!this.dependencies.has(dependencyId)) {
          errors.push({
            code: 'MISSING_DEPENDENCY',
            message: `Calculator ${calculatorId} depends on missing calculator ${dependencyId}`,
            dependencyId,
          });
        }
      }
    }

    for (const calculatorId of this.dependencies.keys()) {
      if (this.hasCircularDependency(calculatorId)) {
        errors.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected involving calculator ${calculatorId}`,
          dependencyId: calculatorId,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public resolveDependencies(calculationId: string): string[] {
    const visited = new Set<string>();
    const resolutionOrder: string[] = [];
    
    const dfs = (currentId: string): void => {
      if (visited.has(currentId)) {
        return;
      }
      
      visited.add(currentId);
      
      const dependencies = this.getDependencies(currentId);
      for (const depId of dependencies) {
        dfs(depId);
      }
      
      resolutionOrder.push(currentId);
    };

    dfs(calculationId);
    return resolutionOrder.reverse();
  }
}
