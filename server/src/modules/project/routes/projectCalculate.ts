/**
 * Project Calculate Route
 * POST /api/projects/calculate
 * Thin guest-friendly boundary over the canonical Phase 3 project estimation
 * pipeline. Validates structure and delegates all quantities to the existing
 * calculators through EstimationOrchestrator composition.
 */
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { SUPPORTED_MATERIAL_CATEGORIES } from '../../estimation/domain/project/RateCard.js';
import {
  estimateProject,
  type EstimationScope,
  type ProjectEstimationInput,
  type ProjectPipelineBuilding,
} from '../services/ProjectEstimationPipeline.js';

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
  slabDepthMeters: z.number().min(0.01).max(5).default(0.15),
  plasterThicknessMeters: z.number().min(0.001).max(0.1).default(0.012),
  tileLengthMeters: z.number().min(0.05).max(2).default(0.5),
  tileWidthMeters: z.number().min(0.05).max(2).default(0.5),
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
const EstimationScopeSchema = z.enum(['single-wall', 'selected-walls', 'room', 'project']);

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
      rate: z.number().finite().nullable(),
      unit: z.string().min(1).max(20),
      currency: z.string().min(1).max(10).default('USD'),
      source: z.string().max(200).optional(),
      location: z.string().max(200).optional(),
      notes: z.string().max(300).optional(),
    })).max(30).default([]),
  }).optional(),
  // NEW: Estimation scope for selective wall calculations
  estimationScope: EstimationScopeSchema.default('project'),
  selectedWallIds: z.array(z.string()).min(1).optional(),
}).passthrough();

type ParsedProject = z.infer<typeof ProjectCalculateSchema>;
type ParsedBuilding = ParsedProject['buildings'][number];

function toScope(value: ParsedProject['estimationScope']): EstimationScope {
  return value;
}

function collectProjectWallIds(buildings: ParsedBuilding[]): string[] {
  const ids: string[] = [];
  for (const building of buildings) {
    for (const floor of building.floors) {
      for (const room of floor.rooms) {
        ids.push(`${room.id}-north`, `${room.id}-south`, `${room.id}-east`, `${room.id}-west`);
      }
    }
  }
  return ids;
}

function toPipelineBuildings(buildings: ParsedBuilding[]): ProjectPipelineBuilding[] {
  return buildings.map((building) => ({
    id: building.id,
    name: building.name,
    floors: building.floors.map((floor) => ({
      id: floor.id,
      name: floor.name,
      level: floor.level,
      rooms: floor.rooms.map((room) => ({
        ...room,
        category: room.category ?? 'room',
      })),
    })),
  }));
}

function isScopeValidationError(message: string): boolean {
  return (
    message.includes('Select exactly 1 wall') ||
    message.includes('Select between 1 and 4 walls') ||
    message.includes('expected 4 walls')
  );
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = ProjectCalculateSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${String(issue.path.join('.') || '(root)')}: ${issue.message}`);
      return res.status(400).json({ error: 'Validation failed', details: issues });
    }
    const project = parsed.data;
    const scope = toScope(project.estimationScope);
    const selectedWallIds = project.selectedWallIds ?? [];

    if (scope === 'selected-walls' && selectedWallIds.length === 0) {
      return res.status(400).json({ error: 'Validation failed', details: ['selected-walls scope requires selectedWallIds array with at least 1 wall ID'] });
    }

    if (scope === 'single-wall' && selectedWallIds.length !== 1) {
      return res.status(400).json({ error: 'Validation failed', details: ['single-wall scope requires exactly 1 selectedWallIds'] });
    }

    if (selectedWallIds.length > 0) {
      const allWallIds = collectProjectWallIds(project.buildings);
      for (const wallId of selectedWallIds) {
        if (!allWallIds.includes(wallId)) {
          return res.status(400).json({ error: 'Validation failed', details: [`Selected wall ID '${wallId}' not found in the project`] });
        }
      }

      if (new Set(selectedWallIds).size !== selectedWallIds.length) {
        return res.status(400).json({ error: 'Validation failed', details: ['selectedWallIds contains duplicate wall IDs'] });
      }
    }

    const currency = project.currency ?? 'USD';

    const result = await estimateProject({
      projectId: project.projectId,
      name: project.name,
      currency,
      buildings: toPipelineBuildings(project.buildings),
      rateCard: project.rateCard
        ? {
            currency: project.rateCard.currency,
            entries: project.rateCard.entries.map((entry) => ({
              category: entry.category,
              item: entry.item,
              rate: entry.rate,
              unit: entry.unit,
              currency: entry.currency,
              source: entry.source,
              location: entry.location,
              notes: entry.notes,
            })),
          }
        : undefined,
      estimationScope: scope,
      selectedWallIds,
    });

    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (err instanceof Error && isScopeValidationError(message)) {
      return res.status(400).json({ error: 'Validation failed', details: [message] });
    }
    console.error('[projectCalculate]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Calculation failed', details: [message] });
  }
});

export default router;

