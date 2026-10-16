import express, { Response, Router } from 'express';
import { z } from 'zod';
import { ProjectModel } from '../models/ProjectModel.js';
import { AuthRequest, optionalAuth } from '../../../auth/auth.middleware.js';
import { requirePersistence } from '../../../config/database.js';
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
  cementRatio: z.number().min(0.5).max(10).default(1),
  sandRatio: z.number().min(1).max(12).default(4),
  dryVolumeFactor: z.number().min(1).max(2).default(1.33),
  cementBagWeightKg: z.number().min(20).max(100).default(50),
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
  rate: z.number().finite().nullable().refine(
    (v) => v === null || (v >= 0 && v <= 1000000),
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

function isOwnedBySomeoneElse(docUserId: unknown, reqUserId: string | undefined): boolean {
  return typeof docUserId === 'string' && docUserId.length > 0 && docUserId !== reqUserId;
}

function toDocUserId(doc: unknown): string | undefined {
  if (doc && typeof doc === 'object' && 'userId' in doc) {
    const v = (doc as { userId?: unknown }).userId;
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}

router.get('/projects/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);
    if (ProjectModel.db.readyState === 1) {
      const doc = await ProjectModel.findOne({ projectId: id });
      if (doc) {
        if (isOwnedBySomeoneElse(doc.userId, req.userId)) {
          return res.status(404).json({ error: 'Project not found' });
        }
        return res.json(doc);
      }
    }
    const mem = memoryProjects.get(id);
    if (mem) {
      if (isOwnedBySomeoneElse(toDocUserId(mem), req.userId)) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.json(mem);
    }
    return res.status(404).json({ error: 'Project not found' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to load project' });
  }
});

router.post('/projects', optionalAuth, requirePersistence, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ error: 'Validation failed', details: issues });
    }
    const validated = parsed.data;

    if (ProjectModel.db.readyState === 1) {
      const existing = await ProjectModel.findOne({ projectId: validated.projectId });
      if (existing && isOwnedBySomeoneElse(existing.userId, req.userId)) {
        return res.status(404).json({ error: 'Project not found' });
      }
      const update = req.userId ? { ...validated, userId: req.userId } : validated;
      const updated = await ProjectModel.findOneAndUpdate(
        { projectId: validated.projectId },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.json(updated);
    }
    const memExisting = memoryProjects.get(validated.projectId);
    if (memExisting && isOwnedBySomeoneElse(toDocUserId(memExisting), req.userId)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const memValue = req.userId ? { ...validated, userId: req.userId } : validated;
    memoryProjects.set(validated.projectId, memValue);
    res.json(memValue);
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// GET rate card for a project
router.get('/projects/:id/rate-card', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);
    let project: { rateCard?: unknown; userId?: unknown } | null = null;

    if (ProjectModel.db.readyState === 1) {
      const doc = await ProjectModel.findOne({ projectId: id });
      if (doc) project = doc;
    }
    if (!project) {
      const mem = memoryProjects.get(id) as { rateCard?: unknown; userId?: unknown } | undefined;
      if (mem) project = mem;
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (isOwnedBySomeoneElse(project.userId, req.userId)) {
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
// Legacy guest-compatible mutation path. Authenticated projects require the
// caller to own the project; guest-created projects remain writable by guests.
router.put('/projects/:id/rate-card', optionalAuth, requirePersistence, async (req: AuthRequest, res: Response) => {
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
      const existing = await ProjectModel.findOne({ projectId: id });
      if (existing && isOwnedBySomeoneElse(existing.userId, req.userId)) {
        return res.status(404).json({ error: 'Project not found' });
      }
      const doc = await ProjectModel.findOneAndUpdate(
        { projectId: id },
        { $set: { rateCard } },
        { new: true, upsert: true }
      );
      return res.json({ projectId: id, rateCard: doc?.rateCard });
    }

    const existing = memoryProjects.get(id) as Record<string, unknown> | undefined;
    if (existing && isOwnedBySomeoneElse(toDocUserId(existing), req.userId)) {
      return res.status(404).json({ error: 'Project not found' });
    }
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