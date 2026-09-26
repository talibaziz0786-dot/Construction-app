import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { Calculator } from '../engine/contracts/Calculator.js';
import {
  CalculationInput,
  CalculationOutput,
  ResultStatus,
} from '../engine/contracts/types.js';
import { InvalidMeasurementError, DimensionMismatchError } from '../domain/errors.js';

export interface PlasterQuantityInput {
  netSurfaceArea: Measurement;
  plasterThickness: Measurement;
  wastagePercentage?: number;
  /** Documented cement:sand mortar mix. Defaults to the verified 1:4 plaster specification. */
  cementRatio?: number;
  sandRatio?: number;
  /** Dry-volume factor converting wet plaster to dry mortar. Defaults to 1.33 per verified spec. */
  dryVolumeFactor?: number;
  /** Cement bag weight in kg. Defaults to the Indian standard 50 kg bag. */
  cementBagWeightKg?: number;
}

export interface PlasterQuantityOutput {
  netSurfaceArea: Measurement;
  plasterThickness: Measurement;
  theoreticalVolume: Measurement;
  wastagePercentage: number;
  procurementAllowance: Measurement;
  procurementVolume: Measurement;
  /** Documented mortar mix used for material decomposition. */
  mixRatio: string;
  dryVolumeFactor: number;
  /** Dry mortar volume derived from the procurement (wet) volume. */
  dryMaterialVolume: Measurement;
  /** Cement required for the dry mortar, in kg and 50 kg bags. */
  cementQuantityKg: number;
  cementBags: number;
  /** Sand/balu required for the dry mortar. */
  sandVolume: Measurement;
  cementBagWeightKg: number;
}

export const PlasterQuantityCalculatorDocs = {
  mixRatio: '1:4',
  dryVolumeFactor: 1.33,
  cementBagWeightKg: 50,
  cementDensityKgPerCuM: 1440,
} as const;

export class PlasterQuantityCalculator
  implements Calculator<PlasterQuantityInput, PlasterQuantityOutput>
{
  public readonly identity = {
    calculatorId: 'plaster.quantity',
    name: 'Plaster Quantity Calculator',
    methodologyVersion: '1.1.0',
    domain: 'finishes',
  };

  public async calculate(
    input: CalculationInput<PlasterQuantityInput>
  ): Promise<CalculationOutput<PlasterQuantityOutput>> {
    const {
      netSurfaceArea,
      plasterThickness,
      wastagePercentage = 0,
      cementRatio = 1,
      sandRatio = 4,
      dryVolumeFactor = 1.33,
      cementBagWeightKg = 50,
    } = input.data;

    if (!netSurfaceArea || !plasterThickness) {
      throw new InvalidMeasurementError('Net surface area and plaster thickness are required');
    }

    if (
      netSurfaceArea.dimension !== Dimension.AREA ||
      plasterThickness.dimension !== Dimension.LENGTH
    ) {
      throw new DimensionMismatchError('Net surface area must be AREA and thickness must be LENGTH');
    }

    if (netSurfaceArea.value <= 0 || plasterThickness.value <= 0) {
      throw new InvalidMeasurementError('Surface area and thickness must be greater than zero');
    }

    if (wastagePercentage < 0 || !Number.isFinite(wastagePercentage)) {
      throw new InvalidMeasurementError('Invalid wastage percentage');
    }

    if (
      !Number.isFinite(cementRatio) ||
      !Number.isFinite(sandRatio) ||
      cementRatio <= 0 ||
      sandRatio <= 0 ||
      !Number.isFinite(dryVolumeFactor) ||
      dryVolumeFactor <= 0 ||
      !Number.isFinite(cementBagWeightKg) ||
      cementBagWeightKg <= 0
    ) {
      throw new InvalidMeasurementError('Invalid plaster mix specification');
    }

    const areaSqM = netSurfaceArea.toBase();
    const thicknessM = plasterThickness.toBase();

    const theoreticalVolumeCuM = areaSqM * thicknessM;
    const procurementAllowanceCuM = theoreticalVolumeCuM * (wastagePercentage / 100);
    const procurementVolumeCuM = theoreticalVolumeCuM + procurementAllowanceCuM;

    // Material decomposition (verified plaster specification):
    // wet procurement volume -> dry mortar (factor 1.33) -> 1:4 cement:sand split.
    // Cement density 1440 kg/cu.m converts cement volume to kg, then to 50 kg bags.
    const dryMaterialVolumeCuM = procurementVolumeCuM * dryVolumeFactor;
    const totalParts = cementRatio + sandRatio;
    const cementVolumeCuM = dryMaterialVolumeCuM * (cementRatio / totalParts);
    const sandVolumeCuM = dryMaterialVolumeCuM * (sandRatio / totalParts);
    const cementQuantityKg = cementVolumeCuM * 1440;
    const cementBags = cementQuantityKg / cementBagWeightKg;

    return {
      calculator: this.identity,
      result: {
        netSurfaceArea,
        plasterThickness,
        theoreticalVolume: Measurement.fromBase(theoreticalVolumeCuM, Unit.CU_M),
        wastagePercentage,
        procurementAllowance: Measurement.fromBase(procurementAllowanceCuM, Unit.CU_M),
        procurementVolume: Measurement.fromBase(procurementVolumeCuM, Unit.CU_M),
        mixRatio: `${cementRatio}:${sandRatio}`,
        dryVolumeFactor,
        dryMaterialVolume: Measurement.fromBase(dryMaterialVolumeCuM, Unit.CU_M),
        cementQuantityKg,
        cementBags,
        sandVolume: Measurement.fromBase(sandVolumeCuM, Unit.CU_M),
        cementBagWeightKg,
      },
      status: ResultStatus.SUCCESS,
      assumptions: [
        {
          id: 'plaster-volume',
          description: 'Plaster volume calculated as net surface area multiplied by plaster thickness.',
          source: 'Standard Civil Engineering Practice',
          verified: true,
        },
        {
          id: 'plaster-mix',
          description: `Cement:sand mortar ${cementRatio}:${sandRatio}; dry-volume factor ${dryVolumeFactor}; cement 1440 kg/cu.m; bag ${cementBagWeightKg} kg.`,
          source: 'Verified plaster specification (CPWD practice)',
          verified: true,
        },
      ],
      warnings: [],
      trace: {
        calculatorId: this.identity.calculatorId,
        methodologyVersion: this.identity.methodologyVersion,
        timestamp: new Date().toISOString(),
        inputValues: {
          netSurfaceArea: { value: netSurfaceArea.value, unit: netSurfaceArea.unit },
          plasterThickness: { value: plasterThickness.value, unit: plasterThickness.unit },
          wastagePercentage,
        },
      },
      isEstimate: true,
    };
  }
}
