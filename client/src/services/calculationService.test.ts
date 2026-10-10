import { describe, it, expect } from 'vitest';
import {
  CalculationUnavailableError,
  buildProjectCalculatePayload,
  toCleanScope,
  type ProjectCalculatePayload,
} from './calculationService.js';

/** Minimal valid house: one room whose 10 ft height is stored as 3.048 m. */
function validHouse() {
  return {
    projectId: 'proj-1',
    name: 'My House Project',
    type: 'house',
    createdAt: '2026-01-01T00:00:00.000Z',
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
                lengthMeters: 3.048,
                widthMeters: 3.048,
                wallHeightMeters: 3.048,
                wallThicknessMeters: 0.1016,
                openings: [
                  { id: 'op-1', type: 'door', widthMeters: 0.9, heightMeters: 2.1, quantity: 1, wallSide: 'north' },
                ],
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
}

function firstRoom(payload: ProjectCalculatePayload): Record<string, unknown> {
  return payload.buildings[0].floors[0].rooms[0];
}

describe('project calculate payload', () => {
  it('sends the canonical metre value for a 10 ft wall height', () => {
    const payload = buildProjectCalculatePayload(validHouse(), {
      estimationScope: 'room',
      selectedWallIds: ['room-1-north'],
    });

    expect(firstRoom(payload).wallHeightMeters).toBe(3.048);
    expect(firstRoom(payload).wallThicknessMeters).toBe(0.1016);
    expect(payload.estimationScope).toBe('room');
    expect(payload.selectedWallIds).toEqual(['room-1-north']);
    // Client-only fields must not leak into the server contract.
    expect(payload).not.toHaveProperty('type');
    expect(payload).not.toHaveProperty('createdAt');
  });

  it('stays JSON-serializable (a React event can never enter the body)', () => {
    const payload = buildProjectCalculatePayload(validHouse());
    expect(() => JSON.stringify(payload)).not.toThrow();

    // An event-shaped object is rejected as a scope instead of being serialized.
    const syntheticEvent = {
      nativeEvent: {},
      target: { value: '10' },
      _reactName: 'onClick',
      estimationScope: 'room',
      selectedWallIds: ['room-1-north'],
    };
    expect(toCleanScope(syntheticEvent)).toBeUndefined();

    const withEventScope = buildProjectCalculatePayload(validHouse(), syntheticEvent);
    expect(withEventScope.estimationScope).toBeUndefined();
    expect(withEventScope.selectedWallIds).toBeUndefined();
    expect(JSON.stringify(withEventScope)).not.toContain('nativeEvent');
    expect(JSON.stringify(withEventScope)).not.toContain('_reactName');
  });

  it('keeps a non-positive wall height visible and fails fast with the field path', () => {
    const broken = validHouse();
    broken.buildings[0].floors[0].rooms[0].wallHeightMeters = 0;

    // The invalid canonical value is preserved (never replaced with a fake height)…
    expect(() => buildProjectCalculatePayload(broken)).toThrow(CalculationUnavailableError);
    try {
      buildProjectCalculatePayload(broken);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('wallHeightMeters=0');
      expect(message).toContain('b1/f1/room-1');
    }
  });

  it('rejects the whole-project 400 case before the request is sent', () => {
    const tooLow = validHouse();
    tooLow.buildings[0].floors[0].rooms[0].wallHeightMeters = 0.05;
    expect(() => buildProjectCalculatePayload(tooLow)).toThrow(/wallHeightMeters=0.05/);

    const aboveLimit = validHouse();
    aboveLimit.buildings[0].floors[0].rooms[0].lengthMeters = 200;
    expect(() => buildProjectCalculatePayload(aboveLimit)).toThrow(/lengthMeters=200/);
  });

  it('falls back to canonical defaults only when a value is absent, never when it is invalid', () => {
    const missing = {
      buildings: [{ floors: [{ rooms: [{ id: 'r1', name: 'Room 1' }] }] }],
    };
    const room = firstRoom(buildProjectCalculatePayload(missing));
    expect(room.wallHeightMeters).toBe(3);
    expect(room.lengthMeters).toBe(3);
  });

  it('ignores a leaked event scope but still sends the project', () => {
    const payload = buildProjectCalculatePayload(validHouse(), null);
    expect(payload.buildings).toHaveLength(1);
  });

  it('forwards finishing specs only when the user actually set them', () => {
    const full = validHouse();
    const room = full.buildings[0].floors[0].rooms[0] as Record<string, unknown>;
    room.slabDepthMeters = 0.2;
    room.plasterThicknessMeters = 0.015;
    room.tileLengthMeters = 0.6;
    room.tileWidthMeters = 0.6;

    const withFinishes = firstRoom(buildProjectCalculatePayload(full));
    expect(withFinishes.slabDepthMeters).toBe(0.2);
    expect(withFinishes.plasterThicknessMeters).toBe(0.015);
    expect(withFinishes.tileLengthMeters).toBe(0.6);
    expect(withFinishes.tileWidthMeters).toBe(0.6);

    const withoutFinishes = firstRoom(buildProjectCalculatePayload(validHouse()));
    expect(withoutFinishes).not.toHaveProperty('slabDepthMeters');
    expect(withoutFinishes).not.toHaveProperty('plasterThicknessMeters');
    expect(withoutFinishes).not.toHaveProperty('tileLengthMeters');
    expect(withoutFinishes).not.toHaveProperty('tileWidthMeters');

    // Non-finite values are never forwarded (server keeps its documented default).
    const broken = validHouse();
    const brokenRoom = broken.buildings[0].floors[0].rooms[0] as Record<string, unknown>;
    brokenRoom.slabDepthMeters = Number.NaN;
    expect(firstRoom(buildProjectCalculatePayload(broken))).not.toHaveProperty('slabDepthMeters');
  });
});
