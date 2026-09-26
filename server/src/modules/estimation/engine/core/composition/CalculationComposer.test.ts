import { describe, it, expect, beforeAll } from 'vitest';
import { EstimationOrchestrator } from '../../orchestration/EstimationOrchestrator.js';
import { registerCanonicalCalculators } from '../../../calculators/canonicalCalculators.js';
import { DependencyResolutionError } from '../../DependencyGraph.js';
import { ResultStatus } from '../../contracts/types.js';
import { Measurement } from '../../../domain/measurements/Measurement.js';
import { Dimension, Unit } from '../../../domain/units/types.js';
import { findStepResult, readMeasurementValue } from './CalculationComposer.js';

const CANONICAL_IDS = [
  'concrete.volume',
  'masonry.brick-quantity',
  'plaster.quantity',
  'room.floor-area',
  'tile.quantity',
  'wall.net-area',
];

function length(value: number): Measurement {
  return new Measurement(value, Unit.M, Dimension.LENGTH);
}

describe('CalculationComposer (canonical composed calculations)', () => {
  const orchestrator = EstimationOrchestrator.getInstance();

  beforeAll(() => {
    registerCanonicalCalculators(orchestrator);
  });

  it('registers the canonical calculators idempotently', () => {
    registerCanonicalCalculators(orchestrator);

    expect(
      orchestrator
        .getAllCalculators()
        .map((calculator) => calculator.identity.calculatorId)
        .sort()
    ).toEqual(CANONICAL_IDS);
  });

  it('has a valid dependency graph with the documented dependencies', () => {
    const validation = orchestrator.validateDependencyGraph();

    expect(validation.isValid).toBe(true);
    expect(orchestrator.getDependencies('masonry.brick-quantity')).toContain('wall.net-area');
  });

  it('executes a single step and exposes its output', async () => {
    const output = await orchestrator.composeSteps('test.floor-area', [
      {
        calculatorId: 'room.floor-area',
        input: { source: 'value', value: { length: length(3), width: length(4) } },
      },
    ]);

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.stepCount).toBe(1);
    expect(output.result.calculatorsUsed).toEqual(['room.floor-area']);

    const step = findStepResult(output.result, 'room.floor-area');
    expect(step).toBeDefined();
    expect(readMeasurementValue(step?.output, 'area')).toBeCloseTo(12, 10);
  });

  it('feeds an earlier step result into a later step', async () => {
    const output = await orchestrator.composeSteps('test.wall-area', [
      {
        calculatorId: 'wall.net-area',
        input: {
          source: 'value',
          value: { wallLength: length(12.192), wallHeight: length(3), openings: [] },
        },
      },
    ]);

    expect(output.result.steps).toHaveLength(1);
    expect(findStepResult(output.result, 'wall.net-area')?.isEstimate).toBe(false);
  });

  it('rejects an empty composition', async () => {
    await expect(orchestrator.composeSteps('test.empty', [])).rejects.toBeInstanceOf(
      DependencyResolutionError
    );
  });

  it('rejects duplicate calculator steps in one composition', async () => {
    const step = {
      calculatorId: 'room.floor-area',
      input: { source: 'value' as const, value: { length: length(3), width: length(3) } },
    };

    await expect(
      orchestrator.composeSteps('test.duplicate', [step, step])
    ).rejects.toMatchObject({ code: 'DUPLICATE_STEP' });
  });

  it('rejects calculators that are not registered', async () => {
    await expect(
      orchestrator.composeSteps('test.unknown', [
        { calculatorId: 'rcc.slab', input: { source: 'value', value: {} } },
      ])
    ).rejects.toMatchObject({ code: 'UNKNOWN_CALCULATOR' });
  });
});
