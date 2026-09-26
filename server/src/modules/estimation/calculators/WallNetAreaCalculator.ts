import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { Calculator } from '../engine/contracts/Calculator.js';
import {
  CalculationInput,
  CalculationOutput,
  ResultStatus,
} from '../engine/contracts/types.js';
import { Opening } from '../domain/space/types.js';
import {
  InvalidMeasurementError,
  DimensionMismatchError,
  InconsistentGeometryError,
} from '../domain/errors.js';

export interface WallNetAreaInput {
  wallLength: Measurement;
  wallHeight: Measurement;
  openings?: Opening[];
}

export interface WallNetAreaOutput {
  grossArea: Measurement;
  openingDeductionArea: Measurement;
  netArea: Measurement;
}

export class WallNetAreaCalculator
  implements Calculator<WallNetAreaInput, WallNetAreaOutput>
{
  public readonly identity = {
    calculatorId: 'wall.net-area',
    name: 'Wall Net Area Calculator',
    methodologyVersion: '1.0.0',
    domain: 'space',
  };

  public async calculate(
    input: CalculationInput<WallNetAreaInput>
  ): Promise<CalculationOutput<WallNetAreaOutput>> {
    const { wallLength, wallHeight, openings = [] } = input.data;

    // Validate inputs exist
    if (!wallLength || !wallHeight) {
      throw new InvalidMeasurementError('Wall length and wall height are required');
    }

    // Validate dimensions
    if (
      wallLength.dimension !== Dimension.LENGTH ||
      wallHeight.dimension !== Dimension.LENGTH
    ) {
      throw new DimensionMismatchError(
        'Wall length and wall height must be length dimensions'
      );
    }

    // Validate positivity
    if (wallLength.value <= 0 || wallHeight.value <= 0) {
      throw new InvalidMeasurementError(
        'Wall length and wall height must be greater than zero'
      );
    }

    // Convert wall dimensions to base unit (meters)
    const lengthMeters = wallLength.toBase();
    const heightMeters = wallHeight.toBase();

    const grossAreaSqMeters = lengthMeters * heightMeters;

    // Process openings
    let totalOpeningAreaSqMeters = 0;
    const processedOpeningsTrace: Array<{
      id: string;
      type: string;
      width: { value: number; unit: string };
      height: { value: number; unit: string };
      quantity: number;
      totalAreaSqMeters: number;
    }> = [];

    for (const opening of openings) {
      if (!opening.width || !opening.height) {
        throw new InvalidMeasurementError(
          `Opening ${opening.id || 'unnamed'} is missing width or height`
        );
      }

      if (
        opening.width.dimension !== Dimension.LENGTH ||
        opening.height.dimension !== Dimension.LENGTH
      ) {
        throw new DimensionMismatchError(
          `Opening ${opening.id || 'unnamed'} dimensions must be length dimensions`
        );
      }

      if (opening.width.value <= 0 || opening.height.value <= 0) {
        throw new InvalidMeasurementError(
          `Opening ${opening.id || 'unnamed'} width and height must be greater than zero`
        );
      }

      if (!Number.isInteger(opening.quantity) || opening.quantity <= 0) {
        throw new InvalidMeasurementError(
          `Opening ${opening.id || 'unnamed'} quantity must be a positive integer`
        );
      }

      const openingWidthMeters = opening.width.toBase();
      const openingHeightMeters = opening.height.toBase();

      // Opening individual dimensions bounds check relative to wall
      if (
        openingWidthMeters > lengthMeters ||
        openingHeightMeters > heightMeters
      ) {
        throw new InconsistentGeometryError(
          `Opening ${opening.id || 'unnamed'} dimensions exceed wall dimensions`
        );
      }

      const singleOpeningAreaSqMeters =
        openingWidthMeters * openingHeightMeters;
      const openingTotalAreaSqMeters =
        singleOpeningAreaSqMeters * opening.quantity;

      totalOpeningAreaSqMeters += openingTotalAreaSqMeters;

      processedOpeningsTrace.push({
        id: opening.id,
        type: opening.type,
        width: { value: opening.width.value, unit: opening.width.unit },
        height: { value: opening.height.value, unit: opening.height.unit },
        quantity: opening.quantity,
        totalAreaSqMeters: openingTotalAreaSqMeters,
      });
    }

    if (totalOpeningAreaSqMeters > grossAreaSqMeters) {
      throw new InconsistentGeometryError(
        'Total opening deduction area exceeds gross wall area'
      );
    }

    const netAreaSqMeters = grossAreaSqMeters - totalOpeningAreaSqMeters;

    const grossAreaMeasurement = Measurement.fromBase(
      grossAreaSqMeters,
      Unit.SQ_M
    );
    const openingDeductionMeasurement = Measurement.fromBase(
      totalOpeningAreaSqMeters,
      Unit.SQ_M
    );
    const netAreaMeasurement = Measurement.fromBase(
      netAreaSqMeters,
      Unit.SQ_M
    );

    return {
      calculator: this.identity,
      result: {
        grossArea: grossAreaMeasurement,
        openingDeductionArea: openingDeductionMeasurement,
        netArea: netAreaMeasurement,
      },
      status: ResultStatus.SUCCESS,
      assumptions: [],
      warnings: [],
      trace: {
        calculatorId: this.identity.calculatorId,
        methodologyVersion: this.identity.methodologyVersion,
        timestamp: new Date().toISOString(),
        inputValues: {
          wallLength: {
            value: wallLength.value,
            unit: wallLength.unit,
          },
          wallHeight: {
            value: wallHeight.value,
            unit: wallHeight.unit,
          },
          grossAreaSqMeters,
          totalOpeningDeductionSqMeters: totalOpeningAreaSqMeters,
          netAreaSqMeters,
          openings: processedOpeningsTrace,
        },
      },
      isEstimate: false,
    };
  }
}
