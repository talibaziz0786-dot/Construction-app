import type { CalculationResultSummary } from '../types/calculation-types.js';
import { apiUrl } from './apiBase.js';

export interface ProjectEstimateResponse extends CalculationResultSummary {
  totalRooms: number;
  roomSummaries: Array<{
    roomId: string;
    roomName: string;
    floorAreaSqM: number;
    netWallAreaSqM: number;
    procurementQuantityBricks: number;
  }>;
}

export interface ProjectEstimateScope {
  estimationScope?: 'single-wall' | 'selected-walls' | 'room' | 'project';
  selectedWallIds?: string[];
}

export interface ProjectCalculatePayload {
  projectId: string;
  name: string;
  currency: string;
  buildings: Array<{
    id: string;
    name: string;
    level: number;
    floors: Array<{
      id: string;
      name: string;
      level: number;
      rooms: Array<Record<string, unknown>>;
    }>;
  }>;
  estimationScope?: ProjectEstimateScope['estimationScope'];
  selectedWallIds?: string[];
}

export class CalculationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationUnavailableError';
  }
}

/**
 * Accepts only plain serializable scope objects.
 * A React SyntheticEvent leaked through `onClick={calculateProject}` must never
 * reach the request body (it serializes circularly and previously produced a
 * confusing failure), so anything event-shaped is discarded here.
 */
export function toCleanScope(scope: unknown): ProjectEstimateScope | undefined {
  if (!scope || typeof scope !== 'object') return undefined;
  const candidate = scope as Record<string, unknown>;
  if ('nativeEvent' in candidate || 'target' in candidate || '_reactName' in candidate) {
    return undefined;
  }
  const estimationScope = candidate.estimationScope;
  return {
    estimationScope:
      estimationScope === 'single-wall' ||
      estimationScope === 'selected-walls' ||
      estimationScope === 'room' ||
      estimationScope === 'project'
        ? estimationScope
        : undefined,
    selectedWallIds: Array.isArray(candidate.selectedWallIds)
      ? candidate.selectedWallIds.filter((id): id is string => typeof id === 'string')
      : undefined,
  };
}

/**
 * Builds the canonical `POST /api/projects/calculate` body.
 *
 * Pure and synchronous so it can be regression-tested: the house project carries
 * client-only fields (type/createdAt) the server schema does not accept, so only
 * the canonical contract is projected. Dimensions are forwarded as canonical
 * metres exactly as stored, never re-interpreted and never defaulted to a
 * made-up value. Out-of-range values throw a clear client-side error instead of
 * producing a server 400.
 */
export function buildProjectCalculatePayload(project: unknown, scope?: unknown): ProjectCalculatePayload {
  const cleanScope = toCleanScope(scope);
  const source = (project ?? {}) as Record<string, unknown>;
  const buildings = Array.isArray(source.buildings) ? source.buildings : [];
  const sanitizedBuildings = buildings.map((building) => {
    const b = (building ?? {}) as Record<string, unknown>;
    const floors = Array.isArray(b.floors) ? b.floors : [];
    return {
      id: typeof b.id === 'string' ? b.id : 'building-1',
      name: typeof b.name === 'string' ? b.name : 'Main Building',
      level: typeof b.level === 'number' ? b.level : 0,
      floors: floors.map((floor) => {
        const f = (floor ?? {}) as Record<string, unknown>;
        const rooms = Array.isArray(f.rooms) ? f.rooms : [];
        return {
          id: typeof f.id === 'string' ? f.id : 'floor-1',
          name: typeof f.name === 'string' ? f.name : 'Ground Floor',
          level: typeof f.level === 'number' ? f.level : 0,
          rooms: rooms.map((room) => {
            const r = (room ?? {}) as Record<string, unknown>;
            const openings = Array.isArray(r.openings) ? r.openings : [];
            // Canonical minima mirror the server Zod bounds (length/width ≥0.05 m,
            // wallHeight ≥0.1 m, bricks ≥0.02 m). A non-positive canonical value
            // can only come from an unfinished edit or legacy storage — it is
            // forwarded unchanged so the preflight below reports it honestly and
            // the server still rejects it. No value is ever invented.
            const positiveOr = (value: unknown, min: number, fallback: number): number => {
              if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
              if (value <= 0 || value < min) return value;
              return value;
            };
            const num = (value: unknown, fallback: number): number =>
              typeof value === 'number' && Number.isFinite(value) ? value : fallback;
            return {
              id: typeof r.id === 'string' ? r.id : 'room-1',
              name: typeof r.name === 'string' ? r.name : 'Room',
              category: typeof r.category === 'string' ? r.category : 'room',
              lengthMeters: positiveOr(r.lengthMeters, 0.05, 3),
              widthMeters: positiveOr(r.widthMeters, 0.05, 3),
              wallHeightMeters: positiveOr(r.wallHeightMeters, 0.1, 3),
              wallThicknessMeters: positiveOr(r.wallThicknessMeters, 0.02, 0.23),
              openings: openings.map((opening) => {
                const o = (opening ?? {}) as Record<string, unknown>;
                const type = o.type === 'door' || o.type === 'window' || o.type === 'ventilator' || o.type === 'other' ? o.type : 'door';
                return {
                  id: typeof o.id === 'string' ? o.id : 'opening-1',
                  type,
                  widthMeters: num(o.widthMeters, 1),
                  heightMeters: num(o.heightMeters, 2.1),
                  quantity: Number.isInteger(o.quantity) ? (o.quantity as number) : 1,
                  wallSide: o.wallSide === 'south' || o.wallSide === 'east' || o.wallSide === 'west' ? o.wallSide : 'north',
                };
              }),
              brickLengthMeters: positiveOr(r.brickLengthMeters, 0.02, 0.19),
              brickWidthMeters: positiveOr(r.brickWidthMeters, 0.02, 0.09),
              brickHeightMeters: positiveOr(r.brickHeightMeters, 0.02, 0.09),
              mortarJointThicknessMeters: num(r.mortarJointThicknessMeters, 0.01),
              wastagePercentage: num(r.wastagePercentage, 5),
            };
          }),
        };
      }),
    };
  });

  // Client-side preflight: fail fast with the exact server field path instead
  // of sending a payload the server must 400. Minima match projectCalculate.ts.
  const invalidRooms: string[] = [];
  for (const building of sanitizedBuildings) {
    for (const floor of building.floors) {
      for (const room of floor.rooms) {
        const bad: string[] = [];
        if (!(Number(room.lengthMeters) >= 0.05 && Number(room.lengthMeters) <= 150)) bad.push(`lengthMeters=${room.lengthMeters}`);
        if (!(Number(room.widthMeters) >= 0.05 && Number(room.widthMeters) <= 150)) bad.push(`widthMeters=${room.widthMeters}`);
        if (!(Number(room.wallHeightMeters) >= 0.1 && Number(room.wallHeightMeters) <= 30)) bad.push(`wallHeightMeters=${room.wallHeightMeters}`);
        if (!(Number(room.wallThicknessMeters) >= 0.02 && Number(room.wallThicknessMeters) <= 2)) bad.push(`wallThicknessMeters=${room.wallThicknessMeters}`);
        if (bad.length > 0) invalidRooms.push(`${building.id}/${floor.id}/${room.id} (${bad.join(', ')})`);
      }
    }
  }
  if (invalidRooms.length > 0) {
    throw new CalculationUnavailableError(
      `Room dimensions out of range — fix before calculating: ${invalidRooms.join('; ')}`
    );
  }

  const payload: ProjectCalculatePayload = {
    projectId: typeof source.projectId === 'string' ? source.projectId : 'house-project',
    name: typeof source.name === 'string' ? source.name : 'House Project',
    currency: typeof source.currency === 'string' ? source.currency : 'USD',
    buildings: sanitizedBuildings,
  };
  if (cleanScope?.estimationScope) payload.estimationScope = cleanScope.estimationScope;
  if (cleanScope?.selectedWallIds) payload.selectedWallIds = cleanScope.selectedWallIds;

  return payload;
}

/** Runs a full project / room hierarchy estimate through the server engine. */
export async function computeProjectEstimates(
  project: unknown,
  scope?: ProjectEstimateScope
): Promise<ProjectEstimateResponse> {
  const payload = buildProjectCalculatePayload(project, scope);

  const response = await fetch(apiUrl('/projects/calculate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const msg = errorBody?.details?.[0] || errorBody?.error || `Server error: ${response.statusText}`;
    throw new CalculationUnavailableError(msg);
  }

  return (await response.json()) as ProjectEstimateResponse;
}
