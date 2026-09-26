import { describe, it, expect } from 'vitest';
import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { MasonryBrickQuantityCalculator } from './MasonryBrickQuantityCalculator.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

/**
 * Face-module regression trace for the production user scenario:
 * 10 ft x 10 ft wall, 4 in thickness, 9 in x 4 in x 3.5 in brick, 1 in joint, 5% wastage.
 *
 * Orientation contract (single-wythe stretcher bond): brick width (4 in) runs
 * through the wall thickness (4 in); the joint maps to bed + head joints only.
 *
 * Documented face-module trace:
 * - wall area = 10 ft x 10 ft = 100 sq ft = 9.290304 sq.m
 * - net masonry volume = 100 sq ft x 4 in = 33.333 cu ft = 0.943894 cu.m
 * - face module = (9+1 in) x (3.5+1 in) = 10 x 4.5 in = 0.2540 x 0.1143 m
 * - module volume = 0.2540 x 0.1143 x 0.1016 m = 0.002950 cu.m (NO joint on width)
 * - theoretical = 0.943894 / 0.002950 = ~320.0 bricks
 * - wastage 5% = ~16.0 -> procurement = ceil(336.0) = 336 bricks
 *
 * Why the old 269 was wrong: it multiplied (W+j) = 5 in, inventing a 1 in
 * collar joint inside a single-wythe 4 in wall that does not exist, inflating
 * the module to 225 cu in and undercounting by ~16%.
 *
 * Why a ~400 figure differs: it typically assumes a nominal 10 mm joint with a
 * modular 190x90x90 mm brick on a ~9 in wall (or a per-sq-ft thumb rule of
 * ~4 bricks/sq ft), not a 1 in joint with a 9x4x3.5 in custom brick. It is a
 * different input set, not the same wall — so 400 is neither copied nor used
 * as truth here.
 */
function userScenarioInput(wastagePercentage: number) {
  return {
    calculatorId: 'masonry.brick-quantity',
    data: {
      netMasonryVolume: new Measurement(100 * (4 / 12), Unit.CU_FT, Dimension.VOLUME),
      brickLength: new Measurement(9, Unit.INCH, Dimension.LENGTH),
      brickWidth: new Measurement(4, Unit.INCH, Dimension.LENGTH),
      brickHeight: new Measurement(3.5, Unit.INCH, Dimension.LENGTH),
      mortarJointThickness: new Measurement(1, Unit.INCH, Dimension.LENGTH),
      wastagePercentage,
    },
    context: {},
  };
}

describe('MasonryBrickQuantityCalculator', () => {
  const calculator = new MasonryBrickQuantityCalculator();

  it('should calculate brick quantity correctly for normal inputs (metric)', async () => {
    const input = {
      calculatorId: 'masonry.brick-quantity',
      data: {
        netMasonryVolume: new Measurement(1, Unit.CU_M, Dimension.VOLUME),
        brickLength: new Measurement(0.19, Unit.M, Dimension.LENGTH),
        brickWidth: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        brickHeight: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        mortarJointThickness: new Measurement(0.01, Unit.M, Dimension.LENGTH),
        wastagePercentage: 5,
      },
      context: {},
    };

    const output = await calculator.calculate(input);

    // Face-module method: 1 / ((0.20)(0.10)(0.09)) = 555.56 theoretical.
    expect(output.status).toBe('success');
    expect(output.result.theoreticalBrickQuantity).toBeCloseTo(555.5556, 3);
    expect(output.result.procurementAllowance).toBeCloseTo(27.7778, 3);
    expect(output.result.procurementQuantity).toBe(584);
    expect(output.calculator.calculatorId).toBe('masonry.brick-quantity');
    expect(output.trace).toBeDefined();
  });

  it('should calculate brick quantity correctly with imperial units', async () => {
    const input = {
      calculatorId: 'masonry.brick-quantity',
      data: {
        netMasonryVolume: new Measurement(35.3147, Unit.CU_FT, Dimension.VOLUME),
        brickLength: new Measurement(7.48031, Unit.INCH, Dimension.LENGTH),
        brickWidth: new Measurement(3.54331, Unit.INCH, Dimension.LENGTH),
        brickHeight: new Measurement(3.54331, Unit.INCH, Dimension.LENGTH),
        mortarJointThickness: new Measurement(0.393701, Unit.INCH, Dimension.LENGTH),
        wastagePercentage: 0,
      },
      context: {},
    };

    const output = await calculator.calculate(input);

    expect(output.status).toBe('success');
    expect(output.result.theoreticalBrickQuantity).toBeCloseTo(555.56, 1);
    expect(output.result.procurementAllowance).toBeCloseTo(0, 2);
  });

  it('should handle zero wastage percentage correctly', async () => {
    const input = {
      calculatorId: 'masonry.brick-quantity',
      data: {
        netMasonryVolume: new Measurement(1, Unit.CU_M, Dimension.VOLUME),
        brickLength: new Measurement(0.19, Unit.M, Dimension.LENGTH),
        brickWidth: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        brickHeight: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        mortarJointThickness: new Measurement(0.01, Unit.M, Dimension.LENGTH),
        wastagePercentage: 0,
      },
      context: {},
    };

    const output = await calculator.calculate(input);

    expect(output.status).toBe('success');
    expect(output.result.theoreticalBrickQuantity).toBeCloseTo(555.5556, 3);
    expect(output.result.procurementAllowance).toBe(0);
    expect(output.result.procurementQuantity).toBe(556);
  });

  it('should handle omitted wastage percentage (defaults to 0)', async () => {
    const input = {
      calculatorId: 'masonry.brick-quantity',
      data: {
        netMasonryVolume: new Measurement(1, Unit.CU_M, Dimension.VOLUME),
        brickLength: new Measurement(0.19, Unit.M, Dimension.LENGTH),
        brickWidth: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        brickHeight: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        mortarJointThickness: new Measurement(0.01, Unit.M, Dimension.LENGTH),
      },
      context: {},
    };

    const output = await calculator.calculate(input);

    expect(output.status).toBe('success');
    expect(output.result.theoreticalBrickQuantity).toBeCloseTo(555.5556, 3);
    expect(output.result.wastagePercentage).toBe(0);
    expect(output.result.procurementAllowance).toBe(0);
    expect(output.result.procurementQuantity).toBe(556);
  });

  it('warns when wall thickness does not match the brick width direction', async () => {
    const output = await calculator.calculate({
      calculatorId: 'masonry.brick-quantity',
      data: {
        netMasonryVolume: new Measurement(1, Unit.CU_M, Dimension.VOLUME),
        brickLength: new Measurement(0.19, Unit.M, Dimension.LENGTH),
        brickWidth: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        brickHeight: new Measurement(0.09, Unit.M, Dimension.LENGTH),
        mortarJointThickness: new Measurement(0.01, Unit.M, Dimension.LENGTH),
        wastagePercentage: 5,
        wallThickness: new Measurement(0.23, Unit.M, Dimension.LENGTH),
      },
      context: {},
    });

    expect(output.warnings.map((w) => w.code)).toContain('thickness-alignment');
  });

  it('reproduces the 10x10 ft user scenario trace (336 bricks incl. 5% wastage)', async () => {
    const output = await calculator.calculate(userScenarioInput(5));

    expect(output.result.theoreticalBrickQuantity).toBeCloseTo(320, 0);
    expect(output.result.procurementAllowance).toBeCloseTo(16, 0);
    expect(output.result.procurementQuantity).toBe(336);
    expect(output.result.wastagePercentage).toBe(5);
    expect(output.result.effectiveBrickModule.value).toBeGreaterThan(0);
    expect(output.assumptions.map((a) => a.id)).toContain('brick-module-method');
  });

  it('keeps wastage visible separately for the user scenario', async () => {
    const withoutWastage = await calculator.calculate(userScenarioInput(0));
    const withWastage = await calculator.calculate(userScenarioInput(5));

    expect(withoutWastage.result.procurementQuantity).toBe(Math.ceil(withoutWastage.result.theoreticalBrickQuantity));
    expect(withWastage.result.procurementQuantity).toBeGreaterThan(withoutWastage.result.procurementQuantity);
    expect(withWastage.result.procurementAllowance).toBeCloseTo(
      withWastage.result.theoreticalBrickQuantity * 0.05,
      6
    );
  });
});
