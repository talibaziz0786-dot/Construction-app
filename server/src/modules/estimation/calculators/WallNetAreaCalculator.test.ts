import { describe, it, expect, beforeEach } from 'vitest';
import { WallNetAreaCalculator } from './WallNetAreaCalculator.js';
import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { ResultStatus } from '../engine/contracts/types.js';
import { Opening } from '../domain/space/types.js';
import {
  InvalidMeasurementError,
  DimensionMismatchError,
  InconsistentGeometryError,
} from '../domain/errors.js';

describe('WallNetAreaCalculator', () => {
  let calculator: WallNetAreaCalculator;

  beforeEach(() => {
    calculator = new WallNetAreaCalculator();
  });

  it('should calculate gross area with no openings correctly (10m x 3m)', async () => {
    const wallLength = new Measurement(10, Unit.M, Dimension.LENGTH);
    const wallHeight = new Measurement(3, Unit.M, Dimension.LENGTH);

    const output = await calculator.calculate({
      calculatorId: 'wall.net-area',
      data: { wallLength, wallHeight, openings: [] },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.grossArea.value).toBe(30);
    expect(output.result.openingDeductionArea.value).toBe(0);
    expect(output.result.netArea.value).toBe(30);
    expect(output.result.netArea.unit).toBe(Unit.SQ_M);
    expect(output.isEstimate).toBe(false);
  });

  it('should deduct single opening correctly (10m x 3m wall, 1m x 2m door)', async () => {
    const wallLength = new Measurement(10, Unit.M, Dimension.LENGTH);
    const wallHeight = new Measurement(3, Unit.M, Dimension.LENGTH);

    const door: Opening = {
      id: 'd1',
      type: 'door',
      width: new Measurement(1, Unit.M, Dimension.LENGTH),
      height: new Measurement(2, Unit.M, Dimension.LENGTH),
      quantity: 1,
    };

    const output = await calculator.calculate({
      calculatorId: 'wall.net-area',
      data: { wallLength, wallHeight, openings: [door] },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.grossArea.value).toBe(30);
    expect(output.result.openingDeductionArea.value).toBe(2);
    expect(output.result.netArea.value).toBe(28);
  });

  it('should deduct multiple openings with quantity > 1 correctly', async () => {
    const wallLength = new Measurement(10, Unit.M, Dimension.LENGTH);
    const wallHeight = new Measurement(3, Unit.M, Dimension.LENGTH);

    const windows: Opening = {
      id: 'w1',
      type: 'window',
      width: new Measurement(1.5, Unit.M, Dimension.LENGTH),
      height: new Measurement(1, Unit.M, Dimension.LENGTH),
      quantity: 2, // total opening area = 1.5 * 1 * 2 = 3 sq.m
    };

    const output = await calculator.calculate({
      calculatorId: 'wall.net-area',
      data: { wallLength, wallHeight, openings: [windows] },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.openingDeductionArea.value).toBe(3);
    expect(output.result.netArea.value).toBe(27);
  });

  it('should handle mixed compatible units (ft wall, m openings)', async () => {
    const wallLength = new Measurement(20, Unit.FT, Dimension.LENGTH); // 6.096 m
    const wallHeight = new Measurement(10, Unit.FT, Dimension.LENGTH); // 3.048 m
    // Gross wall area = 6.096 * 3.048 = 18.580608 sq.m

    const door: Opening = {
      id: 'd1',
      type: 'door',
      width: new Measurement(1, Unit.M, Dimension.LENGTH),
      height: new Measurement(2, Unit.M, Dimension.LENGTH),
      quantity: 1, // 2 sq.m
    };

    const output = await calculator.calculate({
      calculatorId: 'wall.net-area',
      data: { wallLength, wallHeight, openings: [door] },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.grossArea.value).toBeCloseTo(18.5806, 3);
    expect(output.result.openingDeductionArea.value).toBe(2);
    expect(output.result.netArea.value).toBeCloseTo(16.5806, 3);
  });

  it('should throw InconsistentGeometryError when opening is larger than wall', async () => {
    const wallLength = new Measurement(5, Unit.M, Dimension.LENGTH);
    const wallHeight = new Measurement(3, Unit.M, Dimension.LENGTH);

    const oversizedDoor: Opening = {
      id: 'd1',
      type: 'door',
      width: new Measurement(6, Unit.M, Dimension.LENGTH), // wider than wall
      height: new Measurement(2, Unit.M, Dimension.LENGTH),
      quantity: 1,
    };

    await expect(
      calculator.calculate({
        calculatorId: 'wall.net-area',
        data: { wallLength, wallHeight, openings: [oversizedDoor] },
        context: {},
      })
    ).rejects.toThrow(InconsistentGeometryError);
  });

  it('should throw InconsistentGeometryError when total opening area exceeds gross wall area', async () => {
    const wallLength = new Measurement(5, Unit.M, Dimension.LENGTH);
    const wallHeight = new Measurement(3, Unit.M, Dimension.LENGTH); // Gross = 15 sq.m

    const multipleWindows: Opening = {
      id: 'w1',
      type: 'window',
      width: new Measurement(2, Unit.M, Dimension.LENGTH),
      height: new Measurement(2, Unit.M, Dimension.LENGTH),
      quantity: 4, // Total area = 4 * 4 = 16 sq.m > 15 sq.m
    };

    await expect(
      calculator.calculate({
        calculatorId: 'wall.net-area',
        data: { wallLength, wallHeight, openings: [multipleWindows] },
        context: {},
      })
    ).rejects.toThrow(InconsistentGeometryError);
  });

  it('should throw Error on invalid/negative dimensions or quantity', () => {
    expect(() => new Measurement(-10, Unit.M, Dimension.LENGTH)).toThrow('Measurement value cannot be negative');
  });
});
