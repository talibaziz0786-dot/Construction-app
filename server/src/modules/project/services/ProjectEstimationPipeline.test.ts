import { describe, it, expect } from 'vitest';
import { registerCanonicalCalculators } from '../../estimation/calculators/canonicalCalculators.js';
import { EstimationOrchestrator } from '../../estimation/engine/orchestration/EstimationOrchestrator.js';
import { estimateProject, resolveEstimationWalls, toPipelineRateCard } from './ProjectEstimationPipeline.js';
import type { ProjectEstimationInput } from './ProjectEstimationPipeline.js';
import { deriveWallsFromRoom } from '../../estimation/domain/space/utils.js';

registerCanonicalCalculators(EstimationOrchestrator.getInstance());

function singleRoomInput(): ProjectEstimationInput {
  return {
    projectId: 'pipeline-test',
    name: 'Pipeline House',
    currency: 'USD',
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
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('ProjectEstimationPipeline (canonical orchestration)', () => {
  it('produces deterministic material, BOQ, and cost output for one room', async () => {
    const input = singleRoomInput();
    const first = await estimateProject(input);
    const second = await estimateProject(singleRoomInput());

    expect(first.totalRooms).toBe(1);
    expect(first.roomSummaries).toHaveLength(1);
    expect(first.floorAreaSqM).toBeCloseTo(20, 8);
    expect(first.netWallAreaSqM).toBeCloseTo(54, 8);
    expect(first.procurementQuantityBricks).toBeGreaterThan(first.theoreticalBrickQuantity);
    expect(JSON.stringify(second.materialSummary)).toBe(JSON.stringify(first.materialSummary));
    expect(JSON.stringify(second.traversal)).toBe(JSON.stringify(first.traversal));
    expect(first.calculationTrace[0]?.calculators).toEqual([
      'room.floor-area',
      'wall.net-area',
      'masonry.brick-quantity',
      'concrete.volume',
      'plaster.quantity',
      'tile.quantity',
    ]);
    expect(first.integrity.duplicateRoomIds).toEqual([]);
    expect(first.boq.sections).toHaveLength(1);
    expect(first.costSummary.hasMissingRates).toBe(true);
    expect(first.assumptions.length).toBeGreaterThanOrEqual(11);
  });

  it('merges compatible rooms and preserves missing-rate honesty', async () => {
    const input = singleRoomInput();
    const room = input.buildings[0]?.floors[0]?.rooms[0];
    if (!room) throw new Error('Test fixture is missing its room');
    input.buildings[0]?.floors[0]?.rooms.push({ ...room, id: 'room-2', name: 'Room 2' });

    const result = await estimateProject(input);
    expect(result.totalRooms).toBe(2);
    expect(result.traversal.map((entry) => entry.roomId)).toEqual(['room-1', 'room-2']);
    const brick = result.materialSummary.find((line) => line.category === 'brick');
    expect(brick?.contexts).toEqual(expect.arrayContaining(['Living Room', 'Room 2']));
    expect(brick?.procurementQuantity).toBe(
      result.roomSummaries.reduce((sum, summary) => sum + summary.procurementQuantityBricks, 0)
    );
    expect(result.costSummary.hasMissingRates).toBe(true);
    expect(result.boq.hasMissingRates).toBe(true);
  });

  it('rejects invalid wall scope selections without crashing', async () => {
    const room = singleRoomInput().buildings[0]?.floors[0]?.rooms[0];
    if (!room) throw new Error('Test fixture is missing its room');
    const walls = deriveWallsFromRoom(room);
    expect(() => resolveEstimationWalls(room, walls, 'single-wall', [])).toThrow('Select exactly 1 wall');
    expect(() => resolveEstimationWalls(room, walls, 'selected-walls', [])).toThrow('Select between 1 and 4 walls');

    const scoped = await estimateProject({ ...singleRoomInput(), estimationScope: 'single-wall', selectedWallIds: ['room-1-north'] });
    expect(scoped.totalRooms).toBe(1);
    expect(scoped.traversal[0]?.wallCount).toBe(1);
    expect(scoped.netWallAreaSqM).toBeCloseTo(15, 8);
  });

  it('builds an empty canonical rate card when none is supplied', () => {
    const card = toPipelineRateCard('pipeline-test', 'USD', undefined);
    expect(card.projectId).toBe('pipeline-test');
    expect(card.entries).toEqual([]);
  });
});
