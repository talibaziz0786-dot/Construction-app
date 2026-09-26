import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { ProjectModel } from '../models/ProjectModel.js';
import { SUPPORTED_MATERIAL_CATEGORIES } from '../../estimation/domain/project/RateCard.js';

const router = Router();
const memoryProjects = new Map<string, unknown>();

const OpeningSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['door', 'window']),
  widthMeters: z.number().min(0.1).max(10),
  heightMeters: z.number().min(0.1).max(10),
  quantity: z.number().int().min(1).max(100),
});

const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  category: z.string().optional(),
  lengthMeters: z.number().min(0.1).max(100),
  widthMeters: z.number().min(0.1).max(100),
  wallHeightMeters: z.number().min(0.5).max(20),
  wallThicknessMeters: z.number().min(0.05).max(2),
  openings: z.array(OpeningSchema).max(50).default([]),
  brickLengthMeters: z.number().min(0.05).max(1).default(0.19),
  brickWidthMeters: z.number().min(0.05).max(1).default(0.09),
  brickHeightMeters: z.number().min(0.05).max(1).default(0.09),
  mortarJointThicknessMeters: z.number().min(0).max(0.1).default(0.01),
  wastagePercentage: z.number().min(0).max(50).default(5),
  slabDepthMeters: z.number().min(0.01).max(5).default(0.15),
  plasterThicknessMeters: z.number().min(0.001).max(0.1).default(0.012),
  tileLengthMeters: z.number().min(0.05).max(2).default(0.5),
  tileWidthMeters: z.number().min(0.05).max(2).default(0.5),
});

const FloorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  level: z.number().int().min(0).max(200).default(0),
  rooms: z.array(RoomSchema).max(100).default([]),
});

const BuildingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  floors: z.array(FloorSchema).max(50).default([]),
});

const RateCardEntrySchema = z.object({
  category: z.enum(SUPPORTED_MATERIAL_CATEGORIES),
  item: z.string().max(120).optional(),
  rate: z.number().nullable().refine(
    (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 1000000),
    { message: 'Rate must be null, 0, or a non-negative number up to 1000000' }
  ),
  unit: z.string().min(1).max(20),
  currency: z.string().min(1).max(10).default('USD'),
  source: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(300).optional(),
});

const RateCardSchema = z.object({
  currency: z.string().min(1).max(10).default('USD'),
  entries: z.array(RateCardEntrySchema).max(20).default([]),
});

export const ProjectSchema = z.object({
  projectId: z.string().min(1).max(100),
  name: z.string().min(1).max(150),
  type: z.enum(['room', 'house']).default('house'),
  createdAt: z.string().optional(),
  buildings: z.array(BuildingSchema).max(20).default([]),
  rateCard: RateCardSchema.optional(),
});

function asString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const id = asString(req.params.id);
    if (ProjectModel.db.readyState === 1) {
      const doc = await ProjectModel.findOne({ projectId: id });
      if (doc) return res.json(doc);
    }
    const mem = memoryProjects.get(id);
    return mem ? res.json(mem) : res.status(404).json({ error: 'Project not found' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ error: 'Validation failed', details: issues });
    }
    const validated = parsed.data;

    if (ProjectModel.db.readyState === 1) {
      const updated = await ProjectModel.findOneAndUpdate(
        { projectId: validated.projectId },
        validated,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.json(updated);
    }
    memoryProjects.set(validated.projectId, validated);
    res.json(validated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

// GET rate card for a project
router.get('/projects/:id/rate-card', async (req: Request, res: Response) => {
  try {
    const id = asString(req.params.id);
    let project: { rateCard?: unknown } | null = null;

    if (ProjectModel.db.readyState === 1) {
      const doc = await ProjectModel.findOne({ projectId: id });
      if (doc) project = doc;
    }
    if (!project) {
      const mem = memoryProjects.get(id) as { rateCard?: unknown } | undefined;
      if (mem) project = mem;
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({
      projectId: id,
      rateCard: project.rateCard || { currency: 'USD', entries: [] },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to load rate card' });
  }
});

// PUT/UPDATE rate card for a project
router.put('/projects/:id/rate-card', async (req: Request, res: Response) => {
  try {
    const id = asString(req.params.id);
    const parsed = RateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ error: 'Validation failed', details: issues });
    }

    const rateCard = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    if (ProjectModel.db.readyState === 1) {
      const doc = await ProjectModel.findOneAndUpdate(
        { projectId: id },
        { $set: { rateCard } },
        { new: true, upsert: true }
      );
      return res.json({ projectId: id, rateCard: doc?.rateCard });
    }

    const existing = memoryProjects.get(id) as Record<string, unknown> | undefined;
    if (existing) {
      existing.rateCard = rateCard;
      memoryProjects.set(id, existing);
    } else {
      memoryProjects.set(id, {
        projectId: id,
        name: 'Untitled',
        rateCard,
        buildings: [],
        createdAt: new Date().toISOString(),
      });
    }
    return res.json({ projectId: id, rateCard });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update rate card' });
  }
});

export default router;