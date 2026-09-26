import express, { Response } from 'express';
import { z } from 'zod';
import { ProjectModel } from '../models/ProjectModel.js';
import { AuthRequest, requireAuth } from '../../../auth/auth.middleware.js';
import { SUPPORTED_MATERIAL_CATEGORIES } from '../../estimation/domain/project/RateCard.js';

const router = express.Router();

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

function asString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

// List all projects for authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (ProjectModel.db.readyState === 1) {
      const projects = await ProjectModel.find({ userId: req.userId }).sort({ updatedAt: -1 });
      return res.json({ projects });
    }
    // Fallback to memory for development
    const userProjects: unknown[] = [];
    req.app.locals?._memoryProjects?.forEach((proj: unknown) => {
      const p = proj as { userId?: string };
      if (p.userId === req.userId) userProjects.push(p);
    });
    res.json({ projects: userProjects });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// Update project (requires ownership)
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);
    const { name, type, buildings, rateCard } = req.body;

    if (ProjectModel.db.readyState === 1) {
      // CRITICAL: Check ownership before update
      const existing = await ProjectModel.findOne({ projectId: id });
      if (!existing) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (existing.userId && existing.userId !== req.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Update with ownership enforced
      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (type) updateData.type = type;
      if (buildings) updateData.buildings = buildings;
      if (rateCard) updateData.rateCard = rateCard;

      const updated = await ProjectModel.findOneAndUpdate(
        { projectId: id, userId: req.userId },
        updateData,
        { new: true }
      );
      if (!updated) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.json(updated);
    }
    res.status(500).json({ error: 'Memory storage not supported for updates' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project (requires ownership)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = asString(req.params.id);

    if (ProjectModel.db.readyState === 1) {
      // CRITICAL: Only delete if owned by user
      const result = await ProjectModel.findOneAndDelete({ projectId: id, userId: req.userId });
      if (!result) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }
      return res.json({ message: 'Project deleted' });
    }
    res.status(500).json({ error: 'Memory storage not supported for deletes' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Update rate card (requires ownership)
router.put('/:id/rate-card', requireAuth, async (req: AuthRequest, res: Response) => {
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
      // Verify ownership
      const existing = await ProjectModel.findOne({ projectId: id, userId: req.userId });
      if (!existing) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }
      const doc = await ProjectModel.findOneAndUpdate(
        { projectId: id, userId: req.userId },
        { $set: { rateCard } },
        { new: true }
      );
      return res.json({ projectId: id, rateCard: doc?.rateCard });
    }
    res.status(500).json({ error: 'Memory storage not supported' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update rate card' });
  }
});

export default router;