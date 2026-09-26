import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { Calculator } from '../engine/contracts/Calculator.js';
import {
  CalculationInput,
  CalculationOutput,
  ResultStatus,
} from '../engine/contracts/types.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

export interface RoomFloorAreaInput {
  length: Measurement;
  width: Measurement;
}

export interface RoomFloorAreaOutput {
  area: Measurement;
}

export class RoomFloorAreaCalculator
  implements Calculator<RoomFloorAreaInput, RoomFloorAreaOutput>
{
  public readonly identity = {
    calculatorId: 'room.floor-area',
    name: 'Room Floor Area Calculator',
    methodologyVersion: '1.0.0',
    domain: 'space',
  };

  public async calculate(
    input: CalculationInput<RoomFloorAreaInput>
  ): Promise<CalculationOutput<RoomFloorAreaOutput>> {
    const { length, width } = input.data;

    // Validation
    if (!length || !width) {
      throw new InvalidMeasurementError('Length and width are required');
    }

    if (length.dimension !== Dimension.LENGTH || width.dimension !== Dimension.LENGTH) {
      throw new DimensionMismatchError('Both length and width must be length dimensions');
    }

    if (length.value <= 0 || width.value <= 0) {
      throw new InvalidMeasurementError('Length and width must be greater than zero');
    }

    // Standardize to internal Base Unit (Meters)
    const lengthMeters = length.toBase();
    const widthMeters = width.toBase();

    // Calculate rectangular area in Base Unit (Square Meters)
    const areaSqMeters = lengthMeters * widthMeters;

    const resultMeasurement = Measurement.fromBase(areaSqMeters, Unit.SQ_M);

    return {
      calculator: this.identity,
      result: {
        area: resultMeasurement,
      },
      status: ResultStatus.SUCCESS,
      assumptions: [],
      warnings: [],
      trace: {
        calculatorId: this.identity.calculatorId,
        methodologyVersion: this.identity.methodologyVersion,
        timestamp: new Date().toISOString(),
        inputValues: {
          length: { value: length.value, unit: length.unit },
          width: { value: width.value, unit: width.unit },
        },
      },
      isEstimate: false,
    };
  }
}
