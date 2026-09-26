import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { Calculator } from '../engine/contracts/Calculator.js';
import {
  CalculationInput,
  CalculationOutput,
  ResultStatus,
} from '../engine/contracts/types.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

export interface ConcreteVolumeInput {
  length: Measurement;
  width: Measurement;
  depth: Measurement;
  wastagePercentage?: number;
}

export interface ConcreteVolumeOutput {
  netVolume: Measurement;
  wastagePercentage: number;
  procurementAllowance: Measurement;
  procurementVolume: Measurement;
}

export class ConcreteVolumeCalculator
  implements Calculator<ConcreteVolumeInput, ConcreteVolumeOutput>
{
  public readonly identity = {
    calculatorId: 'concrete.volume',
    name: 'Concrete Volume Calculator',
    methodologyVersion: '1.0.0',
    domain: 'concrete',
  };

  public async calculate(
    input: CalculationInput<ConcreteVolumeInput>
  ): Promise<CalculationOutput<ConcreteVolumeOutput>> {
    const { length, width, depth, wastagePercentage = 0 } = input.data;

    if (!length || !width || !depth) {
      throw new InvalidMeasurementError('Length, width, and depth are required');
    }

    if (
      length.dimension !== Dimension.LENGTH ||
      width.dimension !== Dimension.LENGTH ||
      depth.dimension !== Dimension.LENGTH
    ) {
      throw new DimensionMismatchError('Length, width, and depth must be length dimensions');
    }

    if (length.value <= 0 || width.value <= 0 || depth.value <= 0) {
      throw new InvalidMeasurementError('Length, width, and depth must be greater than zero');
    }

    if (wastagePercentage < 0 || !Number.isFinite(wastagePercentage)) {
      throw new InvalidMeasurementError('Invalid wastage percentage');
    }

    const lengthM = length.toBase();
    const widthM = width.toBase();
    const depthM = depth.toBase();

    const netVolumeCuM = lengthM * widthM * depthM;
    const wastageAllowanceCuM = netVolumeCuM * (wastagePercentage / 100);
    const procurementVolumeCuM = netVolumeCuM + wastageAllowanceCuM;

    return {
      calculator: this.identity,
      result: {
        netVolume: Measurement.fromBase(netVolumeCuM, Unit.CU_M),
        wastagePercentage,
        procurementAllowance: Measurement.fromBase(wastageAllowanceCuM, Unit.CU_M),
        procurementVolume: Measurement.fromBase(procurementVolumeCuM, Unit.CU_M),
      },
      status: ResultStatus.SUCCESS,
      assumptions: [
        {
          id: 'geometric-volume-only',
          description: 'Calculates pure geometric concrete volume (L x W x Depth). Not structural engineering advice.',
          source: 'Standard Estimation Rules',
          verified: true,
        },
      ],
      warnings: [],
      trace: {
        calculatorId: this.identity.calculatorId,
        methodologyVersion: this.identity.methodologyVersion,
        timestamp: new Date().toISOString(),
        inputValues: {
          length: { value: length.value, unit: length.unit },
          width: { value: width.value, unit: width.unit },
          depth: { value: depth.value, unit: depth.unit },
          wastagePercentage,
        },
      },
      isEstimate: true,
    };
  }
}
