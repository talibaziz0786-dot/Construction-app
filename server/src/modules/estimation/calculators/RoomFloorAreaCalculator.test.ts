import { describe, it, expect, beforeEach } from 'vitest';
import { RoomFloorAreaCalculator } from './RoomFloorAreaCalculator.js';
import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { ResultStatus } from '../engine/contracts/types.js';

describe('RoomFloorAreaCalculator', () => {
  let calculator: RoomFloorAreaCalculator;

  beforeEach(() => {
    calculator = new RoomFloorAreaCalculator();
  });

  it('should calculate floor area for 10m x 5m correctly', async () => {
    const length = new Measurement(10, Unit.M, Dimension.LENGTH);
    const width = new Measurement(5, Unit.M, Dimension.LENGTH);

    const output = await calculator.calculate({
      calculatorId: 'room.floor-area',
      data: { length, width },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.area.value).toBe(50);
    expect(output.result.area.unit).toBe(Unit.SQ_M);
    expect(output.isEstimate).toBe(false);
  });

  it('should convert ft to m and calculate sq.m correctly', async () => {
    const length = new Measurement(10, Unit.FT, Dimension.LENGTH); // 3.048 m
    const width = new Measurement(10, Unit.FT, Dimension.LENGTH);  // 3.048 m

    const output = await calculator.calculate({
      calculatorId: 'room.floor-area',
      data: { length, width },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.area.value).toBeCloseTo(9.2903, 3);
    expect(output.result.area.unit).toBe(Unit.SQ_M);
  });

  it('should throw on zero or negative dimensions', async () => {
    const invalidLength = new Measurement(0, Unit.M, Dimension.LENGTH);
    const validWidth = new Measurement(5, Unit.M, Dimension.LENGTH);

    await expect(
      calculator.calculate({
        calculatorId: 'room.floor-area',
        data: { length: invalidLength, width: validWidth },
        context: {},
      })
    ).rejects.toThrow();
  });

  it('should throw on dimension mismatch', async () => {
    const length = new Measurement(10, Unit.SQ_M, Dimension.AREA);
    const width = new Measurement(5, Unit.M, Dimension.LENGTH);

    await expect(
      calculator.calculate({
        calculatorId: 'room.floor-area',
        data: { length, width },
        context: {},
      })
    ).rejects.toThrow();
  });
});
