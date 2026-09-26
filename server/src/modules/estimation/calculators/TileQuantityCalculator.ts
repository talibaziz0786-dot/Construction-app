import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { Calculator } from '../engine/contracts/Calculator.js';
import {
  CalculationInput,
  CalculationOutput,
  ResultStatus,
} from '../engine/contracts/types.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

export interface TileQuantityInput {
  floorArea: Measurement;
  tileLength: Measurement;
  tileWidth: Measurement;
  wastagePercentage?: number;
}

export interface TileQuantityOutput {
  floorArea: Measurement;
  tileDimensions: {
    length: Measurement;
    width: Measurement;
  };
  singleTileArea: Measurement;
  theoreticalTileCount: number;
  wastagePercentage: number;
  procurementAllowance: number;
  procurementTileCount: number;
}

export class TileQuantityCalculator
  implements Calculator<TileQuantityInput, TileQuantityOutput>
{
  public readonly identity = {
    calculatorId: 'tile.quantity',
    name: 'Tile Quantity Calculator',
    methodologyVersion: '1.0.0',
    domain: 'finishes',
  };

  public async calculate(
    input: CalculationInput<TileQuantityInput>
  ): Promise<CalculationOutput<TileQuantityOutput>> {
    const { floorArea, tileLength, tileWidth, wastagePercentage = 0 } = input.data;

    if (!floorArea || !tileLength || !tileWidth) {
      throw new InvalidMeasurementError('Floor area, tile length, and tile width are required');
    }

    if (
      floorArea.dimension !== Dimension.AREA ||
      tileLength.dimension !== Dimension.LENGTH ||
      tileWidth.dimension !== Dimension.LENGTH
    ) {
      throw new DimensionMismatchError('Floor area must be AREA and tile dimensions must be LENGTH');
    }

    if (floorArea.value <= 0 || tileLength.value <= 0 || tileWidth.value <= 0) {
      throw new InvalidMeasurementError('Floor area and tile dimensions must be greater than zero');
    }

    if (wastagePercentage < 0 || !Number.isFinite(wastagePercentage)) {
      throw new InvalidMeasurementError('Invalid wastage percentage');
    }

    const areaSqM = floorArea.toBase();
    const lM = tileLength.toBase();
    const wM = tileWidth.toBase();

    const singleTileAreaSqM = lM * wM;
    if (singleTileAreaSqM <= 0) {
      throw new InvalidMeasurementError('Single tile area must be greater than zero');
    }

    const theoreticalTileCount = areaSqM / singleTileAreaSqM;
    const procurementAllowance = theoreticalTileCount * (wastagePercentage / 100);
    const procurementTileCount = Math.ceil(theoreticalTileCount + procurementAllowance);

    return {
      calculator: this.identity,
      result: {
        floorArea,
        tileDimensions: { length: tileLength, width: tileWidth },
        singleTileArea: Measurement.fromBase(singleTileAreaSqM, Unit.SQ_M),
        theoreticalTileCount,
        wastagePercentage,
        procurementAllowance,
        procurementTileCount,
      },
      status: ResultStatus.SUCCESS,
      assumptions: [
        {
          id: 'tile-count-rounding',
          description: 'Procurement tile count rounded UP to the nearest whole integer.',
          source: 'Standard Construction Practice',
          verified: true,
        },
      ],
      warnings: [],
      trace: {
        calculatorId: this.identity.calculatorId,
        methodologyVersion: this.identity.methodologyVersion,
        timestamp: new Date().toISOString(),
        inputValues: {
          floorArea: { value: floorArea.value, unit: floorArea.unit },
          tileLength: { value: tileLength.value, unit: tileLength.unit },
          tileWidth: { value: tileWidth.value, unit: tileWidth.unit },
          wastagePercentage,
        },
      },
      isEstimate: true,
    };
  }
}
