import { Measurement } from '../domain/measurements/Measurement.js';
import { Unit, Dimension } from '../domain/units/types.js';
import { Calculator } from '../engine/contracts/Calculator.js';
import {
  CalculationInput,
  CalculationOutput,
  ResultStatus,
} from '../engine/contracts/types.js';
import {
  InvalidMeasurementError,
  DimensionMismatchError,
} from '../domain/errors.js';

export interface MasonryBrickQuantityInput {
  netMasonryVolume: Measurement;
  brickLength: Measurement;
  brickWidth: Measurement;
  brickHeight: Measurement;
  mortarJointThickness: Measurement;
  wastagePercentage?: number;
  /**
   * Finished wall thickness (m, canonical). Optional.
   * When supplied, the calculator verifies that the brick width (the dimension
   * aligned with wall thickness for single-wythe stretcher bond) matches the
   * wall thickness and emits a `thickness-alignment` warning otherwise.
   * The count itself stays volume-driven (T/W scaling) so custom bricks keep
   * working; the warning only documents the orientation assumption.
   */
  wallThickness?: Measurement;
}

export interface MasonryBrickQuantityOutput {
  netMasonryVolume: Measurement;
  brickDimensions: {
    length: Measurement;
    width: Measurement;
    height: Measurement;
  };
  mortarJoint: Measurement;
  effectiveBrickModule: Measurement;
  theoreticalBrickQuantity: number;
  wastagePercentage: number;
  procurementAllowance: number;
  procurementQuantity: number;
}

export class MasonryBrickQuantityCalculator
  implements Calculator<MasonryBrickQuantityInput, MasonryBrickQuantityOutput>
{
  public readonly identity = {
    calculatorId: 'masonry.brick-quantity',
    name: 'Masonry Brick Quantity Calculator',
    methodologyVersion: '1.2.0',
    domain: 'masonry',
  };

  public async calculate(
    input: CalculationInput<MasonryBrickQuantityInput>
  ): Promise<CalculationOutput<MasonryBrickQuantityOutput>> {
    const {
      netMasonryVolume,
      brickLength,
      brickWidth,
      brickHeight,
      mortarJointThickness,
      wastagePercentage = 0,
      wallThickness,
    } = input.data;

    // 1. Validation
    if (
      netMasonryVolume.dimension !== Dimension.VOLUME ||
      brickLength.dimension !== Dimension.LENGTH ||
      brickWidth.dimension !== Dimension.LENGTH ||
      brickHeight.dimension !== Dimension.LENGTH ||
      mortarJointThickness.dimension !== Dimension.LENGTH
    ) {
      throw new DimensionMismatchError('Invalid dimension types provided');
    }

    if (
      netMasonryVolume.value <= 0 ||
      brickLength.value <= 0 ||
      brickWidth.value <= 0 ||
      brickHeight.value <= 0 ||
      mortarJointThickness.value < 0
    ) {
      throw new InvalidMeasurementError('Invalid dimensions: dimensions must be positive, mortar thickness non-negative');
    }

    if (wastagePercentage < 0 || !Number.isFinite(wastagePercentage)) {
      throw new InvalidMeasurementError('Invalid wastage percentage');
    }

    if (wallThickness !== undefined && wallThickness !== null) {
      if (wallThickness.dimension !== Dimension.LENGTH) {
        throw new DimensionMismatchError('Invalid dimension types provided');
      }
      if (!(wallThickness.value > 0)) {
        throw new InvalidMeasurementError('Invalid dimensions: wall thickness must be positive');
      }
    }

    // 2. Calculations (Standardized to Meters)
    //
    // Orientation contract (single-wythe stretcher bond, IS 2212 coursing):
    //   brick length  → along the wall face (horizontal run)
    //   brick height  → vertical (course height)
    //   brick width   → through the wall thickness
    // The single joint input is therefore the bed + head joint mapped onto the
    // two FACE dimensions only:
    //   module length = L + j,  module height = H + j.
    //
    // Why the width gets NO joint: in single-wythe work there is no collar
    // joint inside the wythe — the wythe is one brick wide. Multiplying by
    // (W+j) (the old v1.1 method) invents a mortar layer that does not exist
    // and undercounts bricks whenever W ≠ wall thickness. Thickness handling:
    //   courses = V / (face-module area × W); wythes = T / W;
    //   theoretical = courses × wythes = V / ((L+j)(H+j)W).
    // For single-wythe (T == W) this reduces to net face area / module face
    // area; for thicker custom walls it scales by whole/fractional wythes.
    const volumeM3 = netMasonryVolume.toBase();
    const lM = brickLength.toBase();
    const wM = brickWidth.toBase();
    const hM = brickHeight.toBase();
    const jointM = mortarJointThickness.toBase();

    // Effective face module: (L+j) x (H+j) — joint on the two exposed faces.
    const effL = lM + jointM;
    const effH = hM + jointM;
    const faceModuleArea = effL * effH;
    // Volume occupied by one brick-course footprint including its share of the
    // wythe: face-module area × brick width (no joint through thickness).
    const effectiveBrickModuleVolume = faceModuleArea * wM;

    if (!(effectiveBrickModuleVolume > 0) || !Number.isFinite(effectiveBrickModuleVolume)) {
      throw new InvalidMeasurementError('Effective brick module volume must be greater than zero');
    }

    const theoreticalBrickQuantity = volumeM3 / effectiveBrickModuleVolume;
    const procurementAllowance = theoreticalBrickQuantity * (wastagePercentage / 100);
    const procurementQuantity = Math.ceil(theoreticalBrickQuantity + procurementAllowance);

    const warnings: Array<{ code: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];
    if (wallThickness !== undefined && wallThickness !== null) {
      const tM = wallThickness.toBase();
      const rel = Math.abs(tM - wM) / Math.max(wM, 1e-9);
      if (rel > 0.05) {
        const wythes = tM / wM;
        warnings.push({
          code: 'thickness-alignment',
          message: `Wall thickness (${tM.toFixed(4)} m) differs from brick width (${wM.toFixed(4)} m, the thickness direction); count scaled by T/W = ${wythes.toFixed(2)} wythes — verify bond pattern for non-single-wythe walls.`,
          severity: 'medium',
        });
      }
    }

    return {
      calculator: this.identity,
      result: {
        netMasonryVolume,
        brickDimensions: { length: brickLength, width: brickWidth, height: brickHeight },
        mortarJoint: mortarJointThickness,
        effectiveBrickModule: Measurement.fromBase(effectiveBrickModuleVolume, Unit.CU_M),
        theoreticalBrickQuantity,
        wastagePercentage,
        procurementAllowance,
        procurementQuantity,
      },
      status: ResultStatus.SUCCESS,
      assumptions: [
        {
          id: 'brick-module-method',
          description: 'Face-module coursing: theoretical bricks = net masonry volume / ((L+j) x (H+j) x W); single joint input maps to bed + head joints on the two face dimensions; brick width runs through the wall thickness with no collar joint in single-wythe work',
          source: 'IS 2212:1991 (brickwork coursing convention)',
          verified: true,
        },
        {
          id: 'mortar-application',
          description: 'Mortar joint applied to brick length (head joint) and brick height (bed joint); wall thickness direction carries no joint for single-wythe stretcher bond',
          source: 'IS 2212:1991',
          verified: true,
        },
        {
          id: 'brick-orientation',
          description: 'Orientation contract: brick length along wall run, brick height vertical, brick width through wall thickness (single-wythe stretcher bond); custom sizes follow the same mapping',
          source: 'IS 2212:1991',
          verified: true,
        },
      ],
      warnings,
      trace: {
        calculatorId: this.identity.calculatorId,
        methodologyVersion: this.identity.methodologyVersion,
        timestamp: new Date().toISOString(),
        inputValues: {
          netMasonryVolume: netMasonryVolume.value,
          brickLength: brickLength.value,
          brickWidth: brickWidth.value,
          brickHeight: brickHeight.value,
          mortarJointThickness: mortarJointThickness.value,
          wastagePercentage,
        },
      },
      isEstimate: true,
    };
  }
}
