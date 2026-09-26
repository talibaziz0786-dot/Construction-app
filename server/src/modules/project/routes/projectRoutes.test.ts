import { deriveWallsFromRoom } from '../../estimation/domain/space/utils.js';
import type { IRoomSchema } from '../models/ProjectModel.js';
import { describe, it, expect } from 'vitest';
import { ProjectSchema } from './projectRoutes.js';

describe('Project Zod Validation', () => {
  const minimalRoom: IRoomSchema = {
    id: 'r1',
    name: 'Living Room',
    category: 'room',
    lengthMeters: 5,
    widthMeters: 4,
    wallHeightMeters: 3,
    wallThicknessMeters: 0.23,
    openings: [],
    brickLengthMeters: 0.19,
    brickWidthMeters: 0.09,
    brickHeightMeters: 0.09,
    mortarJointThicknessMeters: 0.01,
    wastagePercentage: 5,
  };
  const minimalProject = {
    projectId: 'proj-001',
    name: 'My House',
    type: 'house',
    buildings: [{
      id: 'b1',
      name: 'Main Building',
      floors: [{
        id: 'f1',
        name: 'Ground Floor',
        level: 0,
        rooms: [{
          id: minimalRoom.id,
          name: minimalRoom.name,
          lengthMeters: minimalRoom.lengthMeters,
          widthMeters: minimalRoom.widthMeters,
          wallHeightMeters: minimalRoom.wallHeightMeters,
          wallThicknessMeters: minimalRoom.wallThicknessMeters,
          openings: [],
        }],
      }],
    }],
  };

  it('accepts a minimal valid project', () => {
    const result = ProjectSchema.safeParse(minimalProject);
    expect(result.success).toBe(true);
  });

  it('accepts a project with full room geometry', () => {
    const full = {
      ...minimalProject,
      buildings: [{
        ...minimalProject.buildings[0],
        floors: [{
          ...minimalProject.buildings[0].floors[0],
          rooms: [{
            ...minimalProject.buildings[0].floors[0].rooms[0],
            brickLengthMeters: 0.19,
            brickWidthMeters: 0.09,
            brickHeightMeters: 0.09,
            mortarJointThicknessMeters: 0.01,
            wastagePercentage: 5,
            openings: [
              { id: 'op1', type: 'door', widthMeters: 0.9, heightMeters: 2.1, quantity: 1 },
              { id: 'op2', type: 'window', widthMeters: 1.2, heightMeters: 1.0, quantity: 2 },
            ],
          }],
        }],
      }],
    };
    const result = ProjectSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it('rejects missing projectId', () => {
    const result = ProjectSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = ProjectSchema.safeParse({ projectId: 'p1' });
    expect(result.success).toBe(false);
  });

  it('rejects negative room dimensions', () => {
    const bad = {
      ...minimalProject,
      buildings: [{
        ...minimalProject.buildings[0],
        floors: [{
          ...minimalProject.buildings[0].floors[0],
          rooms: [{ ...minimalProject.buildings[0].floors[0].rooms[0], lengthMeters: -5 }],
        }],
      }],
    };
    const result = ProjectSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects room dimensions exceeding max', () => {
    const bad = {
      ...minimalProject,
      buildings: [{
        ...minimalProject.buildings[0],
        floors: [{
          ...minimalProject.buildings[0].floors[0],
          rooms: [{ ...minimalProject.buildings[0].floors[0].rooms[0], lengthMeters: 500 }],
        }],
      }],
    };
    const result = ProjectSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid opening type', () => {
    const bad = {
      ...minimalProject,
      buildings: [{
        ...minimalProject.buildings[0],
        floors: [{
          ...minimalProject.buildings[0].floors[0],
          rooms: [{
            ...minimalProject.buildings[0].floors[0].rooms[0],
            openings: [{ id: 'o1', type: 'garage', widthMeters: 2, heightMeters: 2, quantity: 1 }],
          }],
        }],
      }],
    };
    const result = ProjectSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid project type', () => {
    const result = ProjectSchema.safeParse({ ...minimalProject, type: 'skyscraper' });
    expect(result.success).toBe(false);
  });

  it('rejects too many buildings', () => {
    const manyBuildings = Array.from({ length: 25 }, (_, i) => ({
      id: `b${i}`, name: `Building ${i}`, floors: [],
    }));
    const result = ProjectSchema.safeParse({ ...minimalProject, buildings: manyBuildings });
    expect(result.success).toBe(false);
  });

  it('applies default values', () => {
    const result = ProjectSchema.safeParse({ projectId: 'p1', name: 'Test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('house');
      expect(result.data.buildings).toEqual([]);
    }
  });

  it('derives canonical walls with stable IDs, correct dimensions, and openings', () => {
    const walls = deriveWallsFromRoom(minimalRoom);
    expect(walls).toHaveLength(4);
    expect(walls[0].id).toBe('r1-north');
    expect(walls[0].length.value).toBe(5);
    expect(walls[1].id).toBe('r1-south');
    expect(walls[1].length.value).toBe(5);
    expect(walls[2].id).toBe('r1-east');
    expect(walls[2].length.value).toBe(4);
    expect(walls[3].id).toBe('r1-west');
    expect(walls[3].length.value).toBe(4);
    expect(walls[0].openings).toHaveLength(0);
  });
});
