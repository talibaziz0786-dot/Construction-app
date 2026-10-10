/**
 * Project Estimation Pipeline
 *
 * Phase 3 domain pipeline for guest-friendly Project → Building → Floor → Room
 * estimation. Traverses validated project structure, derives canonical walls,
 * executes the six registered calculators through canonical orchestration, then
 * delegates aggregation/costs/BOQ to existing canonical helpers.
 *
 * This pipeline contains no construction mathematics. Every quantity comes from
 * a verified calculator executed through EstimationOrchestrator.composeSteps.
 */
import { Measurement } from '../../estimation/domain/measurements/Measurement.js';
import { Dimension, Unit } from '../../estimation/domain/units/types.js';
import { type DerivedWall, deriveWallsFromRoom } from '../../estimation/domain/space/utils.js';
import { EstimationOrchestrator } from '../../estimation/engine/orchestration/EstimationOrchestrator.js';
import {
  findStepResult,
  readMeasurementValue,
  readNumberField,
  readStringField,
} from '../../estimation/engine/core/composition/CalculationComposer.js';
import type { Assumption, Warning } from '../../estimation/engine/contracts/types.js';
import { aggregateMaterialLines, type MaterialQuantityLine } from '../../estimation/domain/materials/aggregation.js';
import {
  aggregateProjectCosts,
  calculateRoomCosts,
  generateBoq,
  type RoomCalculationResult as CostServiceRoomCalculationResult,
  type ProjectCostSummary,
} from '../../estimation/services/CostCalculatorService.js';
import { createEmptyRateCard, type RateCard, type SupportedMaterialCategory } from '../../estimation/domain/project/RateCard.js';
import { PROJECT_BOQ_UNITS, PROJECT_CALCULATOR_IDS, methodologyVersionOf } from '../../estimation/services/ProjectEstimatorCatalog.js';
import type { IBuildingSchema, IFloorSchema, IRoomSchema } from '../models/ProjectModel.js';
import type { Boq } from '../../estimation/domain/boq.js';
import type { AggregatedMaterialLine } from '../../estimation/domain/materials/aggregation.js';

export type EstimationScope = 'single-wall' | 'selected-walls' | 'room' | 'project';

export interface ProjectPipelineRoom extends IRoomSchema {
  category: string;
}

export interface ProjectPipelineFloor extends Omit<IFloorSchema, 'rooms'> {
  rooms: ProjectPipelineRoom[];
}

export interface ProjectPipelineBuilding extends Omit<IBuildingSchema, 'floors'> {
  floors: ProjectPipelineFloor[];
}

export interface RateCardInput {
  currency?: string;
  entries?: Array<{
    category: SupportedMaterialCategory;
    item?: string;
    rate: number | null;
    unit: string;
    currency: string;
    source?: string;
    location?: string;
    notes?: string;
  }>;
}

export interface ProjectEstimationInput {
  projectId: string;
  name: string;
  currency?: string;
  buildings: ProjectPipelineBuilding[];
  rateCard?: RateCardInput;
  estimationScope?: EstimationScope;
  selectedWallIds?: string[];
}

export interface ProjectTraversalEntry {
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorName: string;
  roomId: string;
  roomName: string;
  wallCount: number;
}

export interface ProjectRoomNumbers {
  roomId: string;
  roomName: string;
  floorAreaSqM: number;
  netWallAreaSqM: number;
  netMasonryVolumeCuM: number;
  theoreticalBrickQuantity: number;
  procurementQuantityBricks: number;
}

export interface ProjectEstimationResult {
  projectId: string;
  projectName: string;
  currency: string;
  totalRooms: number;
  roomSummaries: ProjectRoomNumbers[];
  traversal: ProjectTraversalEntry[];
  floorAreaSqM: number;
  grossWallAreaSqM: number;
  openingDeductionSqM: number;
  netWallAreaSqM: number;
  netMasonryVolumeCuM: number;
  theoreticalBrickQuantity: number;
  procurementAllowanceBricks: number;
  procurementQuantityBricks: number;
  costSummary: ProjectCostSummary;
  boq: Boq;
  materialSummary: AggregatedMaterialLine[];
  warnings: string[];
  assumptions: string[];
  methodologyVersion: string;
  calculationTrace: Array<ProjectTraversalEntry & { calculators: string[] }>;
  integrity: {
    duplicateRoomIds: string[];
    roomCount: number;
    materialLineCount: number;
  };
}

function toLengthMeters(value: number): Measurement {
  return new Measurement(value, Unit.M, Dimension.LENGTH);
}

function toAreaSqM(value: number): Measurement {
  return new Measurement(value, Unit.SQ_M, Dimension.AREA);
}

function toVolumeCuM(value: number): Measurement {
  return new Measurement(value, Unit.CU_M, Dimension.VOLUME);
}

function requiredNumber(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`Canonical composition did not expose ${label}`);
  }
  return value;
}

function requiredString(value: string | undefined, label: string): string {
  if (value === undefined) {
    throw new Error(`Canonical composition did not expose ${label}`);
  }
  return value;
}

function createWarningCollector(): { warnings: string[]; push(values: Warning[], roomName: string): void } {
  const warnings: string[] = [];
  return {
    warnings,
    push(values: Warning[], roomName: string): void {
      for (const warning of values) {
        warnings.push(`[${roomName}] ${warning.message}`);
      }
    },
  };
}

function createAssumptionCollector(): { assumptions: string[]; push(values: Assumption[]): void } {
  const assumptions: string[] = [];
  const seen = new Set<string>();
  return {
    assumptions,
    push(values: Assumption[]): void {
      for (const value of values) {
        if (!seen.has(value.description)) {
          seen.add(value.description);
          assumptions.push(value.description);
        }
      }
    },
  };
}

export function resolveEstimationWalls(
  room: ProjectPipelineRoom,
  walls: DerivedWall[],
  scope: EstimationScope,
  selectedWallIds: string[]
): DerivedWall[] {
  const ownedIds = new Set(walls.map((wall) => wall.id));
  const uniqueRequested = Array.from(new Set(selectedWallIds.filter((id) => ownedIds.has(id))));

  if (scope === 'single-wall') {
    if (uniqueRequested.length !== 1) {
      throw new Error('Select exactly 1 wall for single-wall scope');
    }
    return walls.filter((wall) => wall.id === uniqueRequested[0]);
  }

  if (scope === 'selected-walls') {
    if (uniqueRequested.length < 1 || uniqueRequested.length > 4) {
      throw new Error('Select between 1 and 4 walls for selected-walls scope');
    }
    return walls.filter((wall) => uniqueRequested.includes(wall.id));
  }

  if (scope === 'room' || scope === 'project') {
    if (walls.length !== 4) {
      throw new Error(`Invalid room ${room.id}: expected 4 walls, got ${walls.length}`);
    }
    return [...walls];
  }

  throw new Error(`Unknown estimation scope: ${String(scope)}`);
}

export function toPipelineRateCard(projectId: string, currency: string, input: RateCardInput | undefined): RateCard {
  if (!input) {
    return createEmptyRateCard(projectId, currency);
  }
  const card = createEmptyRateCard(projectId, input.currency ?? currency);
  card.entries = (input.entries ?? []).map((entry) => ({
    category: entry.category,
    item: entry.item,
    rate: entry.rate,
    unit: entry.unit,
    currency: entry.currency,
    source: entry.source,
    location: entry.location,
    notes: entry.notes,
    updatedAt: new Date().toISOString(),
  }));
  return card;
}

export const PROJECT_STATIC_ASSUMPTIONS: readonly string[] = [
  'All walls assumed rectangular with uniform height and thickness.',
  'Masonry volume = net wall area × wall thickness.',
  'Standard modular brick with mortar joint applied uniformly.',
  'Opening deductions applied as rectangular area (no special shapes).',
  'Concrete estimated as room slab volume (length × width × slab depth).',
  'Plaster estimated on net wall surface with 1:4 mix, 1.33 dry factor, 50 kg bags.',
  'Tiles estimated from room floor area with the configured tile size.',
  'Material totals aggregate identical category/unit lines with canonical conversion.',
  'Wastage allowance based on user-entered percentage.',
  'Costs are based on user-entered material rates.',
  'These estimates are for planning purposes only.',
];

function projectStaticAssumptions(): string[] {
  return [...PROJECT_STATIC_ASSUMPTIONS];
}


async function composeFloorArea(room: ProjectPipelineRoom): Promise<{ floorAreaSqM: number; assumptions: Assumption[]; warnings: Warning[] }> {
  const composed = await EstimationOrchestrator.getInstance().composeSteps(
    `project.room.floor-area.${room.id}`,
    [
      {
        calculatorId: 'room.floor-area',
        input: {
          source: 'value',
          value: {
            length: toLengthMeters(room.lengthMeters),
            width: toLengthMeters(room.widthMeters),
          },
        },
      },
    ],
    { roomId: room.id, roomName: room.name }
  );
  const step = findStepResult(composed.result, 'room.floor-area');
  return {
    floorAreaSqM: requiredNumber(step === undefined ? undefined : readMeasurementValue(step.output, 'area'), 'room.floor-area.area'),
    assumptions: composed.assumptions,
    warnings: composed.warnings,
  };
}

async function composeWallNetArea(
  room: ProjectPipelineRoom,
  wall: DerivedWall
): Promise<{ grossAreaSqM: number; openingDeductionSqM: number; netAreaSqM: number; assumptions: Assumption[]; warnings: Warning[] }> {
  const composed = await EstimationOrchestrator.getInstance().composeSteps(
    `project.wall.net-area.${wall.id}`,
    [
      {
        calculatorId: 'wall.net-area',
        input: {
          source: 'value',
          value: {
            wallLength: toLengthMeters(wall.length.toBase()),
            wallHeight: toLengthMeters(wall.height.toBase()),
            openings: wall.openings.map((opening) => ({
              id: opening.id,
              type: opening.type,
              width: toLengthMeters(opening.widthMeters),
              height: toLengthMeters(opening.heightMeters),
              quantity: opening.quantity,
            })),
          },
        },
      },
    ],
    { roomId: room.id, roomName: room.name, wallId: wall.id }
  );
  const step = findStepResult(composed.result, 'wall.net-area');
  return {
    grossAreaSqM: requiredNumber(step === undefined ? undefined : readMeasurementValue(step.output, 'grossArea'), 'wall.net-area.grossArea'),
    openingDeductionSqM: requiredNumber(step === undefined ? undefined : readMeasurementValue(step.output, 'openingDeductionArea'), 'wall.net-area.openingDeductionArea'),
    netAreaSqM: requiredNumber(step === undefined ? undefined : readMeasurementValue(step.output, 'netArea'), 'wall.net-area.netArea'),
    assumptions: composed.assumptions,
    warnings: composed.warnings,
  };
}

async function composeBrickQuantity(
  room: ProjectPipelineRoom,
  netMasonryVolumeCuM: number
): Promise<{ theoretical: number; wastagePercentage: number; procurement: number; assumptions: Assumption[]; warnings: Warning[] }> {
  const composed = await EstimationOrchestrator.getInstance().composeSteps(
    `project.masonry.brick-quantity.${room.id}`,
    [
      {
        calculatorId: 'masonry.brick-quantity',
        input: {
          source: 'value',
          value: {
            netMasonryVolume: toVolumeCuM(netMasonryVolumeCuM),
            brickLength: toLengthMeters(room.brickLengthMeters),
            brickWidth: toLengthMeters(room.brickWidthMeters),
            brickHeight: toLengthMeters(room.brickHeightMeters),
            mortarJointThickness: toLengthMeters(room.mortarJointThicknessMeters),
            wastagePercentage: room.wastagePercentage,
            wallThickness: toLengthMeters(room.wallThicknessMeters),
          },
        },
      },
    ],
    { roomId: room.id, roomName: room.name }
  );
  const step = findStepResult(composed.result, 'masonry.brick-quantity');
  return {
    theoretical: requiredNumber(step === undefined ? undefined : readNumberField(step.output, 'theoreticalBrickQuantity'), 'masonry.brick-quantity.theoreticalBrickQuantity'),
    wastagePercentage: requiredNumber(step === undefined ? undefined : readNumberField(step.output, 'wastagePercentage'), 'masonry.brick-quantity.wastagePercentage'),
    procurement: requiredNumber(step === undefined ? undefined : readNumberField(step.output, 'procurementQuantity'), 'masonry.brick-quantity.procurementQuantity'),
    assumptions: composed.assumptions,
    warnings: composed.warnings,
  };
}

async function composeRoomFinishes(
  room: ProjectPipelineRoom,
  netWallAreaSqM: number,
  floorAreaSqM: number
): Promise<{ result: CostServiceRoomCalculationResult; assumptions: Assumption[]; warnings: string[] }> {
  const wastage = room.wastagePercentage;
  const assumptions: Assumption[] = [];
  const collectedWarnings: Warning[] = [];
  const warnings: string[] = [];
  const result: CostServiceRoomCalculationResult = {
    roomId: room.id,
    roomName: room.name,
    floorAreaSqM,
    netWallAreaSqM,
    netMasonryVolumeCuM: 0,
    theoreticalBrickQuantity: 0,
    procurementQuantityBricks: 0,
    wastagePercentage: wastage,
  };
  const orchestrator = EstimationOrchestrator.getInstance();

  const concrete = await orchestrator.composeSteps(
    `project.room-finishes.concrete.${room.id}`,
    [
      {
        calculatorId: 'concrete.volume',
        input: {
          source: 'value',
          value: {
            length: toLengthMeters(room.lengthMeters),
            width: toLengthMeters(room.widthMeters),
            depth: toLengthMeters(room.slabDepthMeters ?? 0.15),
            wastagePercentage: wastage,
          },
        },
      },
    ],
    { roomId: room.id, roomName: room.name }
  );
  const concreteStep = findStepResult(concrete.result, 'concrete.volume');
  result.concreteVolumeCuM = requiredNumber(concreteStep === undefined ? undefined : readMeasurementValue(concreteStep.output, 'netVolume'), 'concrete.volume.netVolume');
  result.procurementVolumeConcreteCuM = requiredNumber(concreteStep === undefined ? undefined : readMeasurementValue(concreteStep.output, 'procurementVolume'), 'concrete.volume.procurementVolume');
  assumptions.push(...concrete.assumptions);
  collectedWarnings.push(...concrete.warnings);

  const plaster = await orchestrator.composeSteps(
    `project.room-finishes.plaster.${room.id}`,
    [
      {
        calculatorId: 'plaster.quantity',
        input: {
          source: 'value',
          value: {
            netSurfaceArea: toAreaSqM(Math.max(0, netWallAreaSqM)),
            plasterThickness: toLengthMeters(room.plasterThicknessMeters ?? 0.012),
            wastagePercentage: wastage,
            cementRatio: room.cementRatio ?? 1,
            sandRatio: room.sandRatio ?? 4,
            dryVolumeFactor: room.dryVolumeFactor ?? 1.33,
            cementBagWeightKg: room.cementBagWeightKg ?? 50,
          },
        },
      },
    ],
    { roomId: room.id, roomName: room.name }
  );
  const plasterStep = findStepResult(plaster.result, 'plaster.quantity');
  result.plasterVolumeCuM = requiredNumber(plasterStep === undefined ? undefined : readMeasurementValue(plasterStep.output, 'theoreticalVolume'), 'plaster.quantity.theoreticalVolume');
  result.procurementVolumePlasterCuM = requiredNumber(plasterStep === undefined ? undefined : readMeasurementValue(plasterStep.output, 'procurementVolume'), 'plaster.quantity.procurementVolume');
  result.plasterCementBags = requiredNumber(plasterStep === undefined ? undefined : readNumberField(plasterStep.output, 'cementBags'), 'plaster.quantity.cementBags');
  result.plasterSandVolumeCuM = requiredNumber(plasterStep === undefined ? undefined : readMeasurementValue(plasterStep.output, 'sandVolume'), 'plaster.quantity.sandVolume');
  result.plasterMixRatio = requiredString(plasterStep === undefined ? undefined : readStringField(plasterStep.output, 'mixRatio'), 'plaster.quantity.mixRatio');
  assumptions.push(...plaster.assumptions);
  collectedWarnings.push(...plaster.warnings);

  const tile = await orchestrator.composeSteps(
    `project.room-finishes.tile.${room.id}`,
    [
      {
        calculatorId: 'tile.quantity',
        input: {
          source: 'value',
          value: {
            floorArea: toAreaSqM(Math.max(0, floorAreaSqM)),
            tileLength: toLengthMeters(room.tileLengthMeters ?? 0.5),
            tileWidth: toLengthMeters(room.tileWidthMeters ?? 0.5),
            wastagePercentage: wastage,
          },
        },
      },
    ],
    { roomId: room.id, roomName: room.name }
  );
  const tileStep = findStepResult(tile.result, 'tile.quantity');
  result.theoreticalTileCount = requiredNumber(tileStep === undefined ? undefined : readNumberField(tileStep.output, 'theoreticalTileCount'), 'tile.quantity.theoreticalTileCount');
  result.procurementTileCount = requiredNumber(tileStep === undefined ? undefined : readNumberField(tileStep.output, 'procurementTileCount'), 'tile.quantity.procurementTileCount');
  assumptions.push(...tile.assumptions);
  collectedWarnings.push(...tile.warnings);
  const seen = new Set<string>();
  const dedupedAssumptions: Assumption[] = [];
  for (const assumption of assumptions) {
    if (!seen.has(assumption.id)) {
      seen.add(assumption.id);
      dedupedAssumptions.push(assumption);
    }
  }
  for (const warning of collectedWarnings) {
    warnings.push(`[${room.name}] ${warning.message}`);
  }

  return { result, assumptions: dedupedAssumptions, warnings };
}

function pushMaterialCategory(
  lines: MaterialQuantityLine[],
  line: Omit<MaterialQuantityLine, 'category'> & { category: SupportedMaterialCategory }
): void {
  lines.push(line);
}

/**
 * Canonical Phase 3 project estimation pipeline.
 *
 * Every quantity is produced through EstimationOrchestrator.composeSteps; this
 * function only traverses project structure, collects traceable results, and
 * delegates aggregation/costs/BOQ to existing canonical helpers.
 */
export async function estimateProject(input: ProjectEstimationInput): Promise<ProjectEstimationResult> {
  const currency = input.currency ?? 'USD';
  const scope: EstimationScope = input.estimationScope ?? 'project';
  const selectedWallIds = input.selectedWallIds ?? [];
  const roomCalculationResults: CostServiceRoomCalculationResult[] = [];
  const materialLines: MaterialQuantityLine[] = [];
  const roomSummaries: ProjectRoomNumbers[] = [];
  const traversal: ProjectTraversalEntry[] = [];
  const warnings = createWarningCollector();
  const assumptions = createAssumptionCollector();
  const finishWarnings: string[] = [];
  const totals = { floor: 0, wall: 0, opening: 0, netWall: 0, vol: 0, theoreticalBricks: 0, procurementBricks: 0, allowance: 0 };

  for (const building of input.buildings) {
    for (const floor of building.floors) {
      for (const room of floor.rooms) {
        const walls = deriveWallsFromRoom(room);
        if (
          (scope === 'single-wall' || scope === 'selected-walls') &&
          !walls.some((wall) => selectedWallIds.includes(wall.id))
        ) {
          continue;
        }
        const selectedWalls = resolveEstimationWalls(room, walls, scope, selectedWallIds);
        const floorResult = await composeFloorArea(room);
        assumptions.push(floorResult.assumptions);
        warnings.push(floorResult.warnings, room.name);

        let grossWallAreaSqM = 0;
        let openingDeductionSqM = 0;
        let netWallAreaSqM = 0;
        for (const wall of selectedWalls) {
          const wallResult = await composeWallNetArea(room, wall);
          grossWallAreaSqM += wallResult.grossAreaSqM;
          openingDeductionSqM += wallResult.openingDeductionSqM;
          netWallAreaSqM += wallResult.netAreaSqM;
          assumptions.push(wallResult.assumptions);
          warnings.push(wallResult.warnings, room.name);
        }

        const netMasonryVolumeCuM = netWallAreaSqM * room.wallThicknessMeters;
        const brickResult = await composeBrickQuantity(room, netMasonryVolumeCuM);
        assumptions.push(brickResult.assumptions);
        warnings.push(brickResult.warnings, room.name);
        const finishes = await composeRoomFinishes(room, netWallAreaSqM, floorResult.floorAreaSqM);
        assumptions.push(finishes.assumptions);
        finishWarnings.push(...finishes.warnings);
        const finishPartial = finishes.result;

        const roomCalculationResult: CostServiceRoomCalculationResult = {
          ...finishPartial,
          roomId: room.id,
          roomName: room.name,
          floorAreaSqM: floorResult.floorAreaSqM,
          netWallAreaSqM,
          netMasonryVolumeCuM,
          theoreticalBrickQuantity: brickResult.theoretical,
          procurementQuantityBricks: brickResult.procurement,
          wastagePercentage: brickResult.wastagePercentage,
        };

        pushMaterialCategory(materialLines, {
          category: 'brick',
          description: `Standard clay brick (${room.name})`,
          unit: PROJECT_BOQ_UNITS.brick,
          theoreticalQuantity: roomCalculationResult.theoreticalBrickQuantity,
          procurementQuantity: roomCalculationResult.procurementQuantityBricks,
          wastagePercentage: roomCalculationResult.wastagePercentage ?? room.wastagePercentage,
          sourceCalculatorId: 'masonry.brick-quantity',
          sourceMethodologyVersion: methodologyVersionOf('masonry.brick-quantity'),
          context: room.name,
        });
        if (roomCalculationResult.procurementVolumeConcreteCuM !== undefined) {
          pushMaterialCategory(materialLines, {
            category: 'concrete',
            description: `Concrete (${room.name})`,
            unit: PROJECT_BOQ_UNITS.concrete,
            theoreticalQuantity: roomCalculationResult.concreteVolumeCuM ?? 0,
            procurementQuantity: roomCalculationResult.procurementVolumeConcreteCuM,
            wastagePercentage: room.wastagePercentage,
            sourceCalculatorId: 'concrete.volume',
            sourceMethodologyVersion: methodologyVersionOf('concrete.volume'),
            context: room.name,
          });
        }
        if (roomCalculationResult.plasterCementBags !== undefined) {
          pushMaterialCategory(materialLines, {
            category: 'cement',
            description: `Cement (${room.name})`,
            unit: PROJECT_BOQ_UNITS.cement,
            theoreticalQuantity: roomCalculationResult.plasterCementBags,
            procurementQuantity: roomCalculationResult.plasterCementBags,
            wastagePercentage: room.wastagePercentage,
            sourceCalculatorId: 'plaster.quantity',
            sourceMethodologyVersion: methodologyVersionOf('plaster.quantity'),
            context: room.name,
          });
        }
        if (roomCalculationResult.plasterSandVolumeCuM !== undefined) {
          pushMaterialCategory(materialLines, {
            category: 'sand',
            description: `Sand (${room.name})`,
            unit: PROJECT_BOQ_UNITS.sand,
            theoreticalQuantity: roomCalculationResult.plasterSandVolumeCuM,
            procurementQuantity: roomCalculationResult.plasterSandVolumeCuM,
            wastagePercentage: room.wastagePercentage,
            sourceCalculatorId: 'plaster.quantity',
            sourceMethodologyVersion: methodologyVersionOf('plaster.quantity'),
            context: room.name,
          });
        }
        if (roomCalculationResult.procurementTileCount !== undefined) {
          pushMaterialCategory(materialLines, {
            category: 'tile',
            description: `Floor tiles (${room.name})`,
            unit: PROJECT_BOQ_UNITS.tile,
            theoreticalQuantity: roomCalculationResult.theoreticalTileCount ?? 0,
            procurementQuantity: roomCalculationResult.procurementTileCount,
            wastagePercentage: room.wastagePercentage,
            sourceCalculatorId: 'tile.quantity',
            sourceMethodologyVersion: methodologyVersionOf('tile.quantity'),
            context: room.name,
          });
        }
        if (roomCalculationResult.procurementVolumePlasterCuM !== undefined) {
          pushMaterialCategory(materialLines, {
            category: 'plaster',
            description: `Plaster (${room.name})`,
            unit: PROJECT_BOQ_UNITS.plaster,
            theoreticalQuantity: roomCalculationResult.plasterVolumeCuM ?? 0,
            procurementQuantity: roomCalculationResult.procurementVolumePlasterCuM,
            wastagePercentage: room.wastagePercentage,
            sourceCalculatorId: 'plaster.quantity',
            sourceMethodologyVersion: methodologyVersionOf('plaster.quantity'),
            context: room.name,
          });
        }

        roomCalculationResults.push(roomCalculationResult);
        roomSummaries.push({
          roomId: room.id,
          roomName: room.name,
          floorAreaSqM: floorResult.floorAreaSqM,
          netWallAreaSqM,
          netMasonryVolumeCuM,
          theoreticalBrickQuantity: brickResult.theoretical,
          procurementQuantityBricks: brickResult.procurement,
        });
        traversal.push({
          buildingId: building.id,
          buildingName: building.name,
          floorId: floor.id,
          floorName: floor.name,
          roomId: room.id,
          roomName: room.name,
          wallCount: selectedWalls.length,
        });

        totals.floor += floorResult.floorAreaSqM;
        totals.wall += grossWallAreaSqM;
        totals.opening += openingDeductionSqM;
        totals.netWall += netWallAreaSqM;
        totals.vol += netMasonryVolumeCuM;
        totals.theoreticalBricks += brickResult.theoretical;
        totals.procurementBricks += brickResult.procurement;
        totals.allowance += brickResult.procurement - brickResult.theoretical;
      }
    }
  }

  const rateCard = toPipelineRateCard(input.projectId, currency, input.rateCard);
  const roomCosts = roomCalculationResults.map((roomResult) => calculateRoomCosts(roomResult, { rateCard, currency }));
  const boq = generateBoq(input.projectId, input.name, roomCalculationResults, { rateCard, currency });
  const materialSummary = aggregateMaterialLines(materialLines);
  const roomIds = traversal.map((entry) => entry.roomId);
  const duplicateRoomIds = roomIds.filter((id, index) => roomIds.indexOf(id) !== index);

  return {
    projectId: input.projectId,
    projectName: input.name,
    currency,
    totalRooms: roomCalculationResults.length,
    roomSummaries,
    traversal,
    floorAreaSqM: totals.floor,
    grossWallAreaSqM: totals.wall,
    openingDeductionSqM: totals.opening,
    netWallAreaSqM: totals.netWall,
    netMasonryVolumeCuM: totals.vol,
    theoreticalBrickQuantity: totals.theoreticalBricks,
    procurementAllowanceBricks: totals.allowance,
    procurementQuantityBricks: totals.procurementBricks,
    costSummary: aggregateProjectCosts(input.projectId, input.name, roomCosts, currency),
    boq,
    materialSummary,
    warnings: [...warnings.warnings, ...finishWarnings],
    assumptions: [...projectStaticAssumptions(), ...assumptions.assumptions],
    methodologyVersion: '1.0.0',
    calculationTrace: traversal.map((entry) => ({ ...entry, calculators: [...PROJECT_CALCULATOR_IDS] })),
    integrity: {
      duplicateRoomIds,
      roomCount: traversal.length,
      materialLineCount: materialLines.length,
    },
  };
}

