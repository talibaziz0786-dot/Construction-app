import { describe, it, expect, beforeEach } from 'vitest';
import { TileQuantityCalculator } from './TileQuantityCalculator.js';
import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { ResultStatus } from '../engine/contracts/types.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

describe('TileQuantityCalculator', () => {
  let calculator: TileQuantityCalculator;

  beforeEach(() => {
    calculator = new TileQuantityCalculator();
  });

  it('should calculate tile quantity correctly for normal metric inputs', async () => {
    const floorArea = new Measurement(20, Unit.SQ_M, Dimension.AREA);
    const tileLength = new Measurement(0.5, Unit.M, Dimension.LENGTH);
    const tileWidth = new Measurement(0.5, Unit.M, Dimension.LENGTH);

    const output = await calculator.calculate({
      calculatorId: 'tile.quantity',
      data: { floorArea, tileLength, tileWidth, wastagePercentage: 10 },
      context: {},
    });

    expect(output.status).toBe(ResultStatus.SUCCESS);
    expect(output.result.singleTileArea.value).toBe(0.25);
    expect(output.result.theoreticalTileCount).toBe(80);
    expect(output.result.procurementAllowance).toBe(8);
    expect(output.result.procurementTileCount).toBe(88);
    expect(output.calculator.calculatorId).toBe('tile.quantity');
  });

  it('should throw error for invalid tile dimensions', async () => {
    const floorArea = new Measurement(20, Unit.SQ_M, Dimension.AREA);
    const tileLength = new Measurement(0, Unit.M, Dimension.LENGTH);
    const tileWidth = new Measurement(0.5, Unit.M, Dimension.LENGTH);

    await expect(
      calculator.calculate({
        calculatorId: 'tile.quantity',
        data: { floorArea, tileLength, tileWidth },
        context: {},
      })
    ).rejects.toThrow(InvalidMeasurementError);
  });
});
