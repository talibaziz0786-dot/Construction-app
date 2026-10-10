import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../../app.js';
import { aggregateMaterialLines } from '../../estimation/domain/materials/aggregation.js';
import { Unit } from '../../estimation/domain/units/types.js';
import { calculateRoomFinishes } from '../../estimation/services/RoomFinishesService.js';

describe('Project Estimation Scope Integration Tests (/api/projects/calculate)', () => {
  const baseProject = {
    projectId: 'integration-test-proj',
    name: 'Integration Test House',
    currency: 'USD',
    buildings: [{
      id: 'b1',
      name: 'Main Building',
      floors: [{
        id: 'f1',
        name: 'Ground Floor',
        level: 0,
        rooms: [{
          id: 'room-1',
          name: 'Living Room',
          category: 'room',
          lengthMeters: 5,
          widthMeters: 4,
          wallHeightMeters: 3,
          wallThicknessMeters: 0.23,
          openings: [
            { id: 'op-n', type: 'door', widthMeters: 1.0, heightMeters: 2.1, quantity: 1, wallSide: 'north' },
            { id: 'op-s', type: 'door', widthMeters: 1.0, heightMeters: 2.1, quantity: 1, wallSide: 'south' },
            { id: 'op-e', type: 'door', widthMeters: 1.0, heightMeters: 2.1, quantity: 1, wallSide: 'east' },
            { id: 'op-w', type: 'door', widthMeters: 1.0, heightMeters: 2.1, quantity: 1, wallSide: 'west' },
          ],
          brickLengthMeters: 0.19,
          brickWidthMeters: 0.09,
          brickHeightMeters: 0.09,
          mortarJointThicknessMeters: 0.01,
          wastagePercentage: 5,
        }],
      }],
    }],
  };

  it('calculates single selected wall successfully with exact expected values', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'single-wall',
        selectedWallIds: ['room-1-north'],
      });

    expect(res.status).toBe(200);
    expect(res.body.grossWallAreaSqM).toBe(15);
    expect(res.body.openingDeductionSqM).toBe(2.1);
    expect(res.body.netWallAreaSqM).toBe(12.9);
    expect(res.body.netMasonryVolumeCuM).toBeCloseTo(12.9 * 0.23, 4);
    expect(res.body.procurementQuantityBricks).toBeGreaterThan(0);
  });

  it('calculates two selected walls successfully', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'selected-walls',
        selectedWallIds: ['room-1-north', 'room-1-south'],
      });

    expect(res.status).toBe(200);
    expect(res.body.grossWallAreaSqM).toBe(30);
    expect(res.body.openingDeductionSqM).toBe(4.2);
    expect(res.body.netWallAreaSqM).toBe(25.8);
    expect(res.body.procurementQuantityBricks).toBeGreaterThan(0);
  });

  it('calculates three selected walls successfully', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'selected-walls',
        selectedWallIds: ['room-1-north', 'room-1-south', 'room-1-east'],
      });

    expect(res.status).toBe(200);
    expect(res.body.grossWallAreaSqM).toBe(42);
    expect(res.body.openingDeductionSqM).toBeCloseTo(6.3, 4);
    expect(res.body.netWallAreaSqM).toBeCloseTo(35.7, 4);
  });

  it('returns controlled 400 validation error when zero walls selected for selected-walls scope', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'selected-walls',
        selectedWallIds: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns controlled 400 validation error when unknown wall ID is provided', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'single-wall',
        selectedWallIds: ['non-existent-wall-id'],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details[0]).toContain("Selected wall ID 'non-existent-wall-id' not found");
  });

  it('returns controlled 400 when wall ID belongs to an unrelated room ID', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'single-wall',
        selectedWallIds: ['other-room-99-north'],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns controlled 400 when duplicate wall IDs are passed in selectedWallIds', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'selected-walls',
        selectedWallIds: ['room-1-north', 'room-1-north'],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details[0]).toContain('contains duplicate wall IDs');
  });

  it('correctly calculates net wall area when wall contains openings', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'single-wall',
        selectedWallIds: ['room-1-east'],
      });

    expect(res.status).toBe(200);
    expect(res.body.grossWallAreaSqM).toBe(12);
    expect(res.body.openingDeductionSqM).toBe(2.1);
    expect(res.body.netWallAreaSqM).toBe(9.9);
  });

  it('produces identical wall-related totals between all-walls selected and full room calculation', async () => {
    const fullRoomRes = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'room',
      });

    const allWallsRes = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'selected-walls',
        selectedWallIds: ['room-1-north', 'room-1-south', 'room-1-east', 'room-1-west'],
      });

    expect(fullRoomRes.status).toBe(200);
    expect(allWallsRes.status).toBe(200);

    expect(allWallsRes.body.grossWallAreaSqM).toBe(fullRoomRes.body.grossWallAreaSqM);
    expect(allWallsRes.body.openingDeductionSqM).toBe(fullRoomRes.body.openingDeductionSqM);
    expect(allWallsRes.body.netWallAreaSqM).toBe(fullRoomRes.body.netWallAreaSqM);
    expect(allWallsRes.body.netMasonryVolumeCuM).toBe(fullRoomRes.body.netMasonryVolumeCuM);
    expect(allWallsRes.body.theoreticalBrickQuantity).toBe(fullRoomRes.body.theoreticalBrickQuantity);
    expect(allWallsRes.body.procurementQuantityBricks).toBe(fullRoomRes.body.procurementQuantityBricks);
  });

  it('calculates all four selected walls successfully', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({
        ...baseProject,
        estimationScope: 'selected-walls',
        selectedWallIds: ['room-1-north', 'room-1-south', 'room-1-east', 'room-1-west'],
      });

    expect(res.status).toBe(200);
    expect(res.body.grossWallAreaSqM).toBe(54);
    expect(res.body.openingDeductionSqM).toBe(8.4);
    expect(res.body.netWallAreaSqM).toBe(45.6);
  });

  it('calculates a minimal one-room house with interpolated validation errors', async () => {
    const minimal = {
      projectId: 'minimal-house',
      name: 'Minimal House',
      buildings: [
        {
          id: 'b1',
          name: 'Main Building',
          floors: [
            {
              id: 'f1',
              name: 'Ground Floor',
              level: 0,
              rooms: [
                {
                  id: 'room-1',
                  name: 'Room 1',
                  category: 'room',
                  lengthMeters: 3.048,
                  widthMeters: 3.048,
                  wallHeightMeters: 3,
                  wallThicknessMeters: 0.1016,
                  openings: [],
                  brickLengthMeters: 0.2286,
                  brickWidthMeters: 0.1016,
                  brickHeightMeters: 0.0889,
                  mortarJointThicknessMeters: 0.0254,
                  wastagePercentage: 5,
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await request(app).post('/api/projects/calculate').send(minimal);

    expect(res.status).toBe(200);
    expect(res.body.totalRooms).toBe(1);
    expect(res.body.procurementQuantityBricks).toBeGreaterThan(0);
  });

  it('interpolates validation messages instead of leaking a template literal', async () => {
    const res = await request(app)
      .post('/api/projects/calculate')
      .send({ projectId: '', name: '', buildings: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    const details = res.body.details as string[];
    expect(details.length).toBeGreaterThan(0);
    for (const detail of details) {
      expect(detail).not.toContain('${i.path');
      expect(detail).toContain(':');
    }
  });

  it('traverses project deterministically with material summary', async () => {
    const house = {
      projectId: 'phase3-multi',
      name: 'Phase 3 House',
      currency: 'INR',
      buildings: [
        {
          id: 'b1',
          name: 'Main Building',
          floors: [
            {
              id: 'f1',
              name: 'Ground Floor',
              level: 0,
              rooms: [
                {
                  id: 'room-a',
                  name: 'Room A',
                  lengthMeters: 5,
                  widthMeters: 4,
                  wallHeightMeters: 3,
                  wallThicknessMeters: 0.23,
                  openings: [],
                  wastagePercentage: 5,
                },
              ],
            },
            {
              id: 'f2',
              name: 'First Floor',
              level: 1,
              rooms: [
                {
                  id: 'room-b',
                  name: 'Room B',
                  lengthMeters: 4,
                  widthMeters: 3,
                  wallHeightMeters: 3,
                  wallThicknessMeters: 0.23,
                  openings: [],
                  wastagePercentage: 5,
                },
                {
                  id: 'room-c',
                  name: 'Room C',
                  lengthMeters: 3,
                  widthMeters: 3,
                  wallHeightMeters: 3,
                  wallThicknessMeters: 0.23,
                  openings: [],
                  wastagePercentage: 5,
                },
              ],
            },
          ],
        },
      ],
    };

    const first = await request(app).post('/api/projects/calculate').send(house);
    const second = await request(app).post('/api/projects/calculate').send(house);

    expect(first.status).toBe(200);
    expect(first.body.totalRooms).toBe(3);
    expect(first.body.traversal.map((t: { roomId: string }) => t.roomId)).toEqual(['room-a', 'room-b', 'room-c']);
    expect(first.body.integrity.duplicateRoomIds).toEqual([]);
    expect(first.body.boq.sections).toHaveLength(3);
    expect(first.body.costSummary.rooms).toHaveLength(3);
    expect(JSON.stringify(second.body.traversal)).toBe(JSON.stringify(first.body.traversal));
    expect(JSON.stringify(second.body.materialSummary)).toBe(JSON.stringify(first.body.materialSummary));
    const brick = (first.body.materialSummary as Array<{ category: string; procurementQuantity: number; contexts: string[] }>).find((m) => m.category === 'brick');
    expect(brick).toBeDefined();
    expect(brick?.contexts).toEqual(expect.arrayContaining(['Room A', 'Room B', 'Room C']));
    const brickTotal = first.body.roomSummaries.reduce((s: number, r: { procurementQuantityBricks: number }) => s + r.procurementQuantityBricks, 0);
    expect(brick?.procurementQuantity).toBe(brickTotal);
  });

  it('keeps unpriced lines honest when rates are missing', async () => {
    const res = await request(app).post('/api/projects/calculate').send({
      projectId: 'phase3-unpriced',
      name: 'Unpriced House',
      buildings: [
        {
          id: 'b1',
          name: 'Main Building',
          floors: [
            {
              id: 'f1',
              name: 'Ground Floor',
              level: 0,
              rooms: [
                {
                  id: 'room-1',
                  name: 'Room 1',
                  lengthMeters: 5,
                  widthMeters: 4,
                  wallHeightMeters: 3,
                  wallThicknessMeters: 0.23,
                  openings: [],
                  wastagePercentage: 5,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.costSummary.hasMissingRates).toBe(true);
    expect(res.body.boq.hasMissingRates).toBe(true);
    const missing = res.body.costSummary.rooms[0].items.filter((i: { missingRate: boolean }) => i.missingRate);
    expect(missing.length).toBeGreaterThan(0);
  });

  it('aggregates compatible units and runs all six canonical calculators', async () => {
    const merged = aggregateMaterialLines([
      {
        category: 'sand',
        description: 'Sand',
        unit: Unit.CU_M,
        theoreticalQuantity: 1,
        procurementQuantity: 1,
        wastagePercentage: 0,
        sourceCalculatorId: 'concrete.volume',
        sourceMethodologyVersion: '1.0.0',
        context: 'Room A',
      },
      {
        category: 'sand',
        description: 'Sand',
        unit: Unit.CU_FT,
        theoreticalQuantity: 35.3147,
        procurementQuantity: 35.3147,
        wastagePercentage: 0,
        sourceCalculatorId: 'concrete.volume',
        sourceMethodologyVersion: '1.0.0',
        context: 'Room B',
      },
    ]);
    const sand = merged.filter((m) => m.category === 'sand');
    expect(sand).toHaveLength(1);
    expect(sand[0].procurementQuantity).toBeCloseTo(2, 3);

    const finishes = await calculateRoomFinishes(
      { id: 'room-1', name: 'Room 1', lengthMeters: 5, widthMeters: 4 },
      45.6,
      20,
      { wastagePercentage: 5 }
    );
    expect(finishes.concreteVolumeCuM).toBeCloseTo(3, 5);
    expect(finishes.plasterMixRatio).toBe('1:4');
    expect(finishes.plasterCementBags).toBeGreaterThan(0);
    expect(finishes.theoreticalTileCount).toBeGreaterThan(0);
  });
});
