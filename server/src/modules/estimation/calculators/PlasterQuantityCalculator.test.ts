import { describe, it, expect, beforeEach } from 'vitest';
import { PlasterQuantityCalculator } from './PlasterQuantityCalculator.js';
import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { ResultStatus } from '../engine/contracts/types.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

/**
 * Verified plaster specification used by every regression below:
 * mix 1:4, dry-volume factor 1.33, cement density 1440 kg/cu.m, 50 kg bag.
 *
 * 100 sq ft x 1 in trace (5% wastage):
 * - wet theoretical = 100 x 1/12 = 8.333 cu ft = 0.235974 cu.m
 * - procurement wet = 8.75 cu ft = 0.247773 cu.m
 * - dry mortar = 0.247773 x 1.33 = 0.329538 cu.m
 * - cement = 0.329538 x 1/5 = 0.065908 cu.m = 94.9 kg = 1.898 bags
 * - sand = 0.329538 x 4/5 = 0.263630 cu.m = 9.31 cu ft
 */

describe('PlasterQuantityCalculator', () => {
  let calculator: PlasterQuantityCalculator;

  beforeEach(() => {
    calculator = new PlasterQuantityCalculator();
  });

  it('should calculate plaster volume correctly for normal metric inputs', async () => {
    const netSurfaceArea = new Measurement(20, Unit.SQ_M, Dimension.AREA);
    const plasterThickness = new Measurement(0.012, Unit.M, Dimension.LENGTH);

    const output = await calculator.calculate({
      calculatorId: 'plaster.quantity',
      data: { netSurfaceArea, plasterThickness, wastagePercentage: 10 },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.theoreticalVolume.value).toBeCloseTo(0.24, 5);
    expect(output.result.wastagePercentage).toBe(10);
    expect(output.result.procurementAllowance.value).toBeCloseTo(0.024, 5);
    expect(output.result.procurementVolume.value).toBeCloseTo(0.264, 5);
    expect(output.calculator.calculatorId).toBe('plaster.quantity');
  });

  it('should throw error for invalid dimensions', async () => {
    // Measurement constructor prevents negative values, so we test with an invalid
    // configuration if the calculator allows zero or if we test valid object structure
    const netSurfaceArea = new Measurement(10, Unit.SQ_M, Dimension.AREA);
    const plasterThickness = new Measurement(0, Unit.M, Dimension.LENGTH);

    await expect(
      calculator.calculate({
        calculatorId: 'plaster.quantity',
        data: { netSurfaceArea, plasterThickness },
        context: {},
      })
    ).rejects.toThrow(InvalidMeasurementError);
  });

  it('reproduces the 100 sq ft x 1 in user trace with cement and sand', async () => {
    const output = await calculator.calculate({
      calculatorId: 'plaster.quantity',
      data: {
        netSurfaceArea: new Measurement(100, Unit.SQ_FT, Dimension.AREA),
        plasterThickness: new Measurement(1, Unit.INCH, Dimension.LENGTH),
        wastagePercentage: 5,
      },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.theoreticalVolume.value).toBeCloseTo(0.235974, 5);
    expect(output.result.procurementVolume.value).toBeCloseTo(0.247773, 5);
    expect(output.result.mixRatio).toBe('1:4');
    expect(output.result.dryVolumeFactor).toBe(1.33);
    expect(output.result.dryMaterialVolume.value).toBeCloseTo(0.329538, 5);
    expect(output.result.cementQuantityKg).toBeCloseTo(94.9, 0);
    expect(output.result.cementBags).toBeCloseTo(1.898, 2);
    expect(output.result.sandVolume.value).toBeCloseTo(0.26363, 5);
    expect(output.result.cementBagWeightKg).toBe(50);
  });
});
