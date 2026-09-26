/**
 * Project Calculate Route
 * POST /api/projects/calculate
 * Orchestrates multi-room project calculations with cost engine and BOQ.
 * All construction math is server-side.
 */
import express, { Request, Response } from 'express';
import { Dimension } from '../../estimation/domain/units/types.js';
import { DerivedWall, deriveWallsFromRoom } from '../../estimation/domain/space/utils.js';
import { z } from 'zod';
import { RoomFloorAreaCalculator } from '../../estimation/calculators/RoomFloorAreaCalculator.js';
import { WallNetAreaCalculator } from '../../estimation/calculators/WallNetAreaCalculator.js';
import { MasonryBrickQuantityCalculator } from '../../estimation/calculators/MasonryBrickQuantityCalculator.js';
import { calculateRoomCosts, aggregateProjectCosts, generateBoq, RoomCalculationResult as CostServiceRoomCalculationResult } from '../../estimation/services/CostCalculatorService.js';
import { createEmptyRateCard, SUPPORTED_MATERIAL_CATEGORIES } from '../../estimation/domain/project/RateCard.js';
import { Measurement } from '../../estimation/domain/measurements/Measurement.js';
import { Unit } from '../../estimation/domain/units/types.js';

const router = express.Router();

const OpeningSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['door', 'window', 'ventilator', 'other']),
  widthMeters: z.number().min(0.05).max(10),
  heightMeters: z.number().min(0.05).max(10),
  quantity: z.number().int().min(1).max(100),
  wallSide: z.enum(['north', 'south', 'east', 'west']).default('north'),
});

const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  category: z.string().default('room'),
  lengthMeters: z.number().min(0.05).max(150),
  widthMeters: z.number().min(0.05).max(150),
  wallHeightMeters: z.number().min(0.1).max(30),
  wallThicknessMeters: z.number().min(0.02).max(2),
  openings: z.array(OpeningSchema).max(50).default([]),
  brickLengthMeters: z.number().min(0.02).max(1).default(0.19),
  brickWidthMeters: z.number().min(0.02).max(1).default(0.09),
  brickHeightMeters: z.number().min(0.02).max(1).default(0.09),
  mortarJointThicknessMeters: z.number().min(0).max(0.1).default(0.01),
  wastagePercentage: z.number().min(0).max(50).default(5),
}).passthrough();

const FloorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  level: z.number().int().min(0).max(200).default(0),
  rooms: z.array(RoomSchema).max(100).default([]),
}).passthrough();

const BuildingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  floors: z.array(FloorSchema).max(50).default([]),
}).passthrough();

// Estimation scope types
const EstimationScope = z.enum(['single-wall', 'selected-walls', 'room', 'project']);

const ProjectCalculateSchema = z.object({
  projectId: z.string().min(1).max(100),
  name: z.string().min(1).max(150),
  currency: z.string().min(1).max(10).default('USD'),
  buildings: z.array(BuildingSchema).max(20).default([]),
  rateCard: z.object({
    currency: z.string().min(1).max(10).default('USD'),
    entries: z.array(z.object({
      category: z.enum(SUPPORTED_MATERIAL_CATEGORIES),
      item: z.string().max(120).optional(),
      rate: z.number().nullable(),
      unit: z.string().min(1).max(20),
      currency: z.string().min(1).max(10).default('USD'),
      source: z.string().max(200).optional(),
      location: z.string().max(200).optional(),
      notes: z.string().max(300).optional(),
    })).max(30).default([]),
  }).optional(),
  // NEW: Estimation scope for selective wall calculations
  estimationScope: EstimationScope.default('project'),
  selectedWallIds: z.array(z.string()).min(1).optional(),
}).passthrough();

const floorCalc = new RoomFloorAreaCalculator();
const wallCalc = new WallNetAreaCalculator();
const brickCalc = new MasonryBrickQuantityCalculator();

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = ProjectCalculateSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${String(issue.path.join('.') || '(root)')}: ${issue.message}`);
      return res.status(400).json({ error: 'Validation failed', details: issues });
    }
    const project = parsed.data;
    const { estimationScope, selectedWallIds } = project;
    const currency = project.currency ?? 'USD';
    const totals = { floor: 0, wall: 0, opening: 0, netWall: 0, vol: 0, theoreticalBricks: 0, allowance: 0, procurementBricks: 0 };
    const roomSummaries: Array<{ roomId: string; roomName: string; floorAreaSqM: number; netWallAreaSqM: number; procurementQuantityBricks: number }> = [];
    const roomCalculationResults: CostServiceRoomCalculationResult[] = [];
    const allWarnings: string[] = [];

    // NEW: Validation for wall selection
    if (estimationScope === 'selected-walls' && (!selectedWallIds || selectedWallIds.length === 0)) {
      return res.status(400).json({ error: 'Validation failed', details: ['selected-walls scope requires selectedWallIds array with at least 1 wall ID'] });
    }

    if (estimationScope === 'single-wall' && (!selectedWallIds || selectedWallIds.length !== 1)) {
      return res.status(400).json({ error: 'Validation failed', details: ['single-wall scope requires exactly 1 selectedWallIds'] });
    }

    // Validate that selected walls exist within the project
    if (selectedWallIds && selectedWallIds.length > 0) {
      const allWallIds = [];
      for (const building of project.buildings) {
        for (const floor of building.floors) {
          for (const room of floor.rooms) {
            const allRoomWalls = deriveWallsFromRoom(room);
            allWallIds.push(...allRoomWalls.map(w => w.id));
          }
        }
      }

      for (const wallId of selectedWallIds) {
        if (!allWallIds.includes(wallId)) {
          return res.status(400).json({ error: 'Validation failed', details: [`Selected wall ID '${wallId}' not found in the project`] });
        }
      }

      // Check for duplicates
      const uniqueWallIds = new Set(selectedWallIds);
      if (uniqueWallIds.size !== selectedWallIds.length) {
        return res.status(400).json({ error: 'Validation failed', details: ['selectedWallIds contains duplicate wall IDs'] });
      }
    }

    for (const building of project.buildings) {
      for (const floor of building.floors) {
        for (const room of floor.rooms) {
          // Skip rooms that don't contain any selected walls (when scope is selected-walls or single-wall)
          if ((estimationScope === 'selected-walls' || estimationScope === 'single-wall') && selectedWallIds) {
            const allRoomWalls = deriveWallsFromRoom(room);
            const roomWallIds = allRoomWalls.map(w => w.id);
            const hasSelectedWalls = selectedWallIds.some(wallId => roomWallIds.includes(wallId));
            if (!hasSelectedWalls) {
              continue; // Skip this room, it has no selected walls
            }
          }

          try {
            const floorResult = await floorCalc.calculate({
              calculatorId: 'room.floor-area',
              data: { length: new Measurement(room.lengthMeters, Unit.M, Dimension.LENGTH), width: new Measurement(room.widthMeters, Unit.M, Dimension.LENGTH) },
              context: { roomId: room.id, roomName: room.name },
            });
            const floorAreaSqM = floorResult.result.area.value;
            totals.floor += floorAreaSqM;

            // For wall-related calculations, process only selected walls if scope requires it
            const allRoomWalls = deriveWallsFromRoom(room);
            const wallsToProcess = (estimationScope === 'selected-walls' || estimationScope === 'single-wall') && selectedWallIds
              ? allRoomWalls.filter(wall => selectedWallIds.includes(wall.id))
              : allRoomWalls;

            let roomGrossWallArea = 0;
            let roomOpeningDeduction = 0;
            let roomNetWallArea = 0;
            let roomNetMasonryVolume = 0;

            for (const wall of wallsToProcess) {
              const wallGrossArea = wall.length.value * wall.height.value;
              const wallOpeningDeduction = wall.openings.reduce((sum, o) => sum + (o.widthMeters * o.heightMeters * o.quantity), 0);
              const wallNetArea = Math.max(0, wallGrossArea - wallOpeningDeduction);
              const wallMasonryVolume = wallNetArea * wall.thickness.value;

              roomGrossWallArea += wallGrossArea;
              roomOpeningDeduction += wallOpeningDeduction;
              roomNetWallArea += wallNetArea;
              roomNetMasonryVolume += wallMasonryVolume;
            }

            totals.wall += roomGrossWallArea;
            totals.opening += roomOpeningDeduction;
            totals.netWall += roomNetWallArea;
            totals.vol += roomNetMasonryVolume;

            // Use room-level brick specifications but with the calculated room-specific net masonry volume
            const brickResult = await brickCalc.calculate({
              calculatorId: 'masonry.brick-quantity',
              data: {
                netMasonryVolume: new Measurement(roomNetMasonryVolume, Unit.CU_M, Dimension.VOLUME),
                brickLength: new Measurement(room.brickLengthMeters, Unit.M, Dimension.LENGTH),
                brickWidth: new Measurement(room.brickWidthMeters, Unit.M, Dimension.LENGTH),
                brickHeight: new Measurement(room.brickHeightMeters, Unit.M, Dimension.LENGTH),
                mortarJointThickness: new Measurement(room.mortarJointThicknessMeters, Unit.M, Dimension.LENGTH),
                wastagePercentage: room.wastagePercentage,
                wallThickness: new Measurement(room.wallThicknessMeters, Unit.M, Dimension.LENGTH),
              },
              context: { roomId: room.id, roomName: room.name },
            });
            const theoreticalBricks = brickResult.result.theoreticalBrickQuantity;
            const procurementBricks = brickResult.result.procurementQuantity;

            totals.theoreticalBricks += theoreticalBricks;
            totals.allowance += (procurementBricks - theoreticalBricks);
            totals.procurementBricks += procurementBricks;

            roomSummaries.push({ roomId: room.id, roomName: room.name, floorAreaSqM, netWallAreaSqM: roomNetWallArea, procurementQuantityBricks: procurementBricks });
            roomCalculationResults.push({ roomId: room.id, roomName: room.name, floorAreaSqM, netWallAreaSqM: roomNetWallArea, netMasonryVolumeCuM: roomNetMasonryVolume, theoreticalBrickQuantity: theoreticalBricks, procurementQuantityBricks: procurementBricks, wastagePercentage: room.wastagePercentage });

            if (brickResult.warnings.length > 0) {
              allWarnings.push(...brickResult.warnings.map((w: { message: string }) => `[${room.name}] ${w.message}`));
            }
          } catch (err) {
            allWarnings.push(`[${room.name}] ${err instanceof Error ? err.message : 'Calculation error'}`);
          }
        }
      }
    }

    const rateCard = project.rateCard
      ? {
          projectId: project.projectId,
          currency: project.rateCard.currency,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          entries: project.rateCard.entries.map((entry) => ({
            category: entry.category,
            item: entry.item,
            rate: entry.rate,
            unit: entry.unit,
            currency: entry.currency,
            source: entry.source,
            location: entry.location,
            notes: entry.notes,
            updatedAt: new Date().toISOString(),
          }))
        }
      : createEmptyRateCard(project.projectId, currency);

    const roomCosts = roomCalculationResults.map(rcr => calculateRoomCosts(rcr, { rateCard, currency }));
    const boq = generateBoq(project.projectId, project.name, roomCalculationResults, { rateCard, currency });

    return res.json({
      projectId: project.projectId,
      projectName: project.name,
      currency,
      totalRooms: roomCalculationResults.length,
      roomSummaries,
      // Flattening the totals object into the main response as expected by the client interfaces
      floorAreaSqM: totals.floor,
      grossWallAreaSqM: totals.wall,
      openingDeductionSqM: totals.opening,
      netWallAreaSqM: totals.netWall,
      netMasonryVolumeCuM: totals.vol,
      theoreticalBrickQuantity: totals.theoreticalBricks,
      procurementAllowanceBricks: totals.allowance,
      procurementQuantityBricks: totals.procurementBricks,
      costSummary: aggregateProjectCosts(project.projectId, project.name, roomCosts, currency),
      boq,
      warnings: allWarnings,
      methodologyVersion: '1.0.0',
      assumptions: [
        'All walls assumed rectangular with uniform height and thickness.',
        'Masonry volume = net wall area × wall thickness.',
        'Standard modular brick with mortar joint applied uniformly.',
        'Opening deductions applied as rectangular area (no special shapes).',
        'Wastage allowance based on user-entered percentage.',
        'Costs are based on user-entered material rates.',
        'These estimates are for planning purposes only.',
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[projectCalculate]', err);
    console.error('[projectCalculate] Request body:', req.body);
    console.error('[projectCalculate]', err);
    return res.status(500).json({ error: 'Calculation failed', details: [message] });
  }
});

export default router;

