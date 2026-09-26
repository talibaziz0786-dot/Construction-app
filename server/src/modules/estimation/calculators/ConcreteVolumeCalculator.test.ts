import { describe, it, expect, beforeEach } from 'vitest';
import { ConcreteVolumeCalculator } from './ConcreteVolumeCalculator.js';
import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { ResultStatus } from '../engine/contracts/types.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

describe('ConcreteVolumeCalculator', () => {
  let calculator: ConcreteVolumeCalculator;

  beforeEach(() => {
    calculator = new ConcreteVolumeCalculator();
  });

  it('should calculate concrete volume correctly for normal metric inputs', async () => {
    const length = new Measurement(5, Unit.M, Dimension.LENGTH);
    const width = new Measurement(4, Unit.M, Dimension.LENGTH);
    const depth = new Measurement(0.15, Unit.M, Dimension.LENGTH);

    const output = await calculator.calculate({
      calculatorId: 'concrete.volume',
      data: { length, width, depth, wastagePercentage: 5 },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.netVolume.value).toBeCloseTo(3.0, 5);
    expect(output.result.netVolume.unit).toBe(Unit.CU_M);
    expect(output.result.wastagePercentage).toBe(5);
    expect(output.result.procurementAllowance.value).toBeCloseTo(0.15, 5);
    expect(output.result.procurementVolume.value).toBeCloseTo(3.15, 5);
    expect(output.calculator.calculatorId).toBe('concrete.volume');
  });

  it('should throw error for invalid dimensions (zero or negative)', async () => {
    const length = new Measurement(0, Unit.M, Dimension.LENGTH);
    const width = new Measurement(4, Unit.M, Dimension.LENGTH);
    const depth = new Measurement(0.15, Unit.M, Dimension.LENGTH);

    await expect(
      calculator.calculate({
        calculatorId: 'concrete.volume',
        data: { length, width, depth },
        context: {},
      })
    ).rejects.toThrow(InvalidMeasurementError);
  });

  it('should throw error for dimension mismatch', async () => {
    const length = new Measurement(5, Unit.SQ_M, Dimension.AREA);
    const width = new Measurement(4, Unit.M, Dimension.LENGTH);
    const depth = new Measurement(0.15, Unit.M, Dimension.LENGTH);

    await expect(
      calculator.calculate({
        calculatorId: 'concrete.volume',
        data: { length, width, depth },
        context: {},
      })
    ).rejects.toThrow(DimensionMismatchError);
  });
});
