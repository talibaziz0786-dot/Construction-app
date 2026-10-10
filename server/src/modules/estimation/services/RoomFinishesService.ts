import { Measurement } from '../domain/measurements/Measurement.js';
import { Dimension, Unit } from '../domain/units/types.js';
import type { IRoomSchema } from '../../project/models/ProjectModel.js';
import { EstimationOrchestrator } from '../engine/orchestration/EstimationOrchestrator.js';
import { findStepResult, readMeasurementValue, readNumberField, readStringField } from '../engine/core/composition/CalculationComposer.js';
import type { Assumption, Warning } from '../engine/contracts/types.js';

export interface RoomFinishesInput {
  slabDepthMeters?: number;
  plasterThicknessMeters?: number;
  tileLengthMeters?: number;
  tileWidthMeters?: number;
  cementRatio?: number;
  sandRatio?: number;
  dryVolumeFactor?: number;
  cementBagWeightKg?: number;
  wastagePercentage: number;
}

export interface RoomFinishesOutput {
  concreteVolumeCuM?: number;
  procurementVolumeConcreteCuM?: number;
  plasterVolumeCuM?: number;
  procurementVolumePlasterCuM?: number;
  plasterCementBags?: number;
  plasterSandVolumeCuM?: number;
  plasterMixRatio?: string;
  theoreticalTileCount?: number;
  procurementTileCount?: number;
  assumptions: string[];
  warnings: string[];
}

function positiveOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Canonical room finishing estimation.
 *
 * Executes ONLY verified calculators (concrete.volume, plaster.quantity,
 * tile.quantity) through the canonical orchestration layer. Concrete is the room
 * slab volume (L x W x slab depth), plaster is applied to the room net wall surface,
 * tile coverage is derived from the room floor area. Never invents a formula.
 */
export async function calculateRoomFinishes(
  room: Pick<IRoomSchema, 'id' | 'name' | 'lengthMeters' | 'widthMeters'>,
  netWallAreaSqM: number,
  floorAreaSqM: number,
  input: RoomFinishesInput
): Promise<RoomFinishesOutput> {
  const assumptions: string[] = [];
  const warnings: string[] = [];
  const output: RoomFinishesOutput = { assumptions, warnings };
  const wastage = nonNegativeOr(input.wastagePercentage, 0);
  const orchestrator = EstimationOrchestrator.getInstance();
  const seenAssumptions = new Set<string>();
  const pushAssumptions = (values: Assumption[]): void => {
    for (const value of values) {
      if (!seenAssumptions.has(value.description)) {
        seenAssumptions.add(value.description);
        assumptions.push(value.description);
      }
    }
  };
  const pushWarnings = (values: Warning[]): void => {
    for (const value of values) {
      warnings.push(`[${room.name}] ${value.message}`);
    }
  };

  function requireNumber(stepName: string, field: string, value: number | undefined): number {
    if (value === undefined) {
      throw new Error(`Composition ${stepName} did not expose ${field}`);
    }
    return value;
  }

  try {
    const composed = await orchestrator.composeSteps(
      `project.room-finishes.concrete.${room.id}`,
      [
        {
          calculatorId: 'concrete.volume',
          input: {
            source: 'value',
            value: {
              length: new Measurement(room.lengthMeters, Unit.M, Dimension.LENGTH),
              width: new Measurement(room.widthMeters, Unit.M, Dimension.LENGTH),
              depth: new Measurement(positiveOr(input.slabDepthMeters, 0.15), Unit.M, Dimension.LENGTH),
              wastagePercentage: wastage,
            },
          },
        },
      ],
      { roomId: room.id, roomName: room.name }
    );
    const step = findStepResult(composed.result, 'concrete.volume');
    output.concreteVolumeCuM = requireNumber('concrete.volume', 'netVolume', step === undefined ? undefined : readMeasurementValue(step.output, 'netVolume'));
    output.procurementVolumeConcreteCuM = requireNumber('concrete.volume', 'procurementVolume', step === undefined ? undefined : readMeasurementValue(step.output, 'procurementVolume'));
    pushAssumptions(composed.assumptions);
    pushWarnings(composed.warnings);
  } catch (error) {
    warnings.push(`[${room.name}] ${error instanceof Error ? error.message : 'Concrete calculation failed'}`);
  }

  try {
    const composed = await orchestrator.composeSteps(
      `project.room-finishes.plaster.${room.id}`,
      [
        {
          calculatorId: 'plaster.quantity',
          input: {
            source: 'value',
            value: {
              netSurfaceArea: new Measurement(Math.max(0, netWallAreaSqM), Unit.SQ_M, Dimension.AREA),
              plasterThickness: new Measurement(positiveOr(input.plasterThicknessMeters, 0.012), Unit.M, Dimension.LENGTH),
              wastagePercentage: wastage,
              cementRatio: positiveOr(input.cementRatio, 1),
              sandRatio: positiveOr(input.sandRatio, 4),
              dryVolumeFactor: positiveOr(input.dryVolumeFactor, 1.33),
              cementBagWeightKg: positiveOr(input.cementBagWeightKg, 50),
            },
          },
        },
      ],
      { roomId: room.id, roomName: room.name }
    );
    const step = findStepResult(composed.result, 'plaster.quantity');
    const mixRatio = step === undefined ? undefined : readStringField(step.output, 'mixRatio');
    output.plasterVolumeCuM = requireNumber('plaster.quantity', 'theoreticalVolume', step === undefined ? undefined : readMeasurementValue(step.output, 'theoreticalVolume'));
    output.procurementVolumePlasterCuM = requireNumber('plaster.quantity', 'procurementVolume', step === undefined ? undefined : readMeasurementValue(step.output, 'procurementVolume'));
    output.plasterCementBags = requireNumber('plaster.quantity', 'cementBags', step === undefined ? undefined : readNumberField(step.output, 'cementBags'));
    output.plasterSandVolumeCuM = requireNumber('plaster.quantity', 'sandVolume', step === undefined ? undefined : readMeasurementValue(step.output, 'sandVolume'));
    if (mixRatio === undefined) {
      throw new Error('Composition plaster.quantity did not expose mixRatio');
    }
    output.plasterMixRatio = mixRatio;
    pushAssumptions(composed.assumptions);
    pushWarnings(composed.warnings);
  } catch (error) {
    warnings.push(`[${room.name}] ${error instanceof Error ? error.message : 'Plaster calculation failed'}`);
  }

  try {
    const composed = await orchestrator.composeSteps(
      `project.room-finishes.tile.${room.id}`,
      [
        {
          calculatorId: 'tile.quantity',
          input: {
            source: 'value',
            value: {
              floorArea: new Measurement(Math.max(0, floorAreaSqM), Unit.SQ_M, Dimension.AREA),
              tileLength: new Measurement(positiveOr(input.tileLengthMeters, 0.5), Unit.M, Dimension.LENGTH),
              tileWidth: new Measurement(positiveOr(input.tileWidthMeters, 0.5), Unit.M, Dimension.LENGTH),
              wastagePercentage: wastage,
            },
          },
        },
      ],
      { roomId: room.id, roomName: room.name }
    );
    const step = findStepResult(composed.result, 'tile.quantity');
    output.theoreticalTileCount = requireNumber('tile.quantity', 'theoreticalTileCount', step === undefined ? undefined : readNumberField(step.output, 'theoreticalTileCount'));
    output.procurementTileCount = requireNumber('tile.quantity', 'procurementTileCount', step === undefined ? undefined : readNumberField(step.output, 'procurementTileCount'));
    pushAssumptions(composed.assumptions);
    pushWarnings(composed.warnings);
  } catch (error) {
    warnings.push(`[${room.name}] ${error instanceof Error ? error.message : 'Tile calculation failed'}`);
  }

  return output;
}
