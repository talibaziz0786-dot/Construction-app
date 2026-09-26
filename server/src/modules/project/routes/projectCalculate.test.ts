import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../../app.js';

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
});
