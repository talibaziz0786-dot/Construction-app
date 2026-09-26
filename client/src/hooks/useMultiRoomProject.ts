import { useState, useCallback, useEffect } from 'react';
import { computeProjectEstimates } from '../services/calculationService.js';
import type { ProjectEstimateResponse, ProjectEstimateScope } from '../services/calculationService.js';

export interface OpeningItem { id: string; type: 'door' | 'window'; widthMeters: number; heightMeters: number; quantity: number; }
export interface RoomData { id: string; name: string; lengthMeters: number; widthMeters: number; wallHeightMeters: number; wallThicknessMeters: number; openings: OpeningItem[]; brickLengthMeters: number; brickWidthMeters: number; brickHeightMeters: number; mortarJointThicknessMeters: number; wastagePercentage: number; }
export interface FloorData { id: string; name: string; level: number; rooms: RoomData[]; }
export interface BuildingData { id: string; name: string; floors: FloorData[]; }
export interface HouseProject { projectId: string; name: string; type: 'room' | 'house'; createdAt: string; buildings: BuildingData[]; }
export interface ProjectEstimateState { result: ProjectEstimateResponse | null; isCalculating: boolean; error: string | null; }

function uuid(): string { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
function defaultRoom(): RoomData { return { id: uuid(), name: 'New Room', lengthMeters: 5, widthMeters: 4, wallHeightMeters: 3, wallThicknessMeters: 0.23, openings: [], brickLengthMeters: 0.19, brickWidthMeters: 0.09, brickHeightMeters: 0.09, mortarJointThicknessMeters: 0.01, wastagePercentage: 5 }; }
function defaultFloor(name = 'Ground Floor', level = 0): FloorData { return { id: uuid(), name, level, rooms: [] }; }
function defaultBuilding(): BuildingData { return { id: uuid(), name: 'Main Building', floors: [defaultFloor()] }; }
function defaultProject(): HouseProject { return { projectId: uuid(), name: 'My House Project', type: 'house', createdAt: new Date().toISOString(), buildings: [defaultBuilding()] }; }
const STORAGE_KEY = 'construction-app:house-project';

export function useMultiRoomProject() {
  const [project, setProject] = useState<HouseProject>(() => { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) as HouseProject; } catch { /* ignore */ } return defaultProject(); });
  const [estimate, setEstimate] = useState<ProjectEstimateState>({ result: null, isCalculating: false, error: null });
  const [activeBuildingIdx, setActiveBuildingIdx] = useState(0);
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* ignore */ } }, [project]);

  const renameProject = useCallback((name: string) => setProject((p) => ({ ...p, name })), []);
  const resetProject = useCallback(() => { const n = defaultProject(); n.projectId = uuid(); setProject(n); setActiveBuildingIdx(0); setActiveFloorIdx(0); setActiveRoomId(null); setEstimate({ result: null, isCalculating: false, error: null }); }, []);
  const addBuilding = useCallback(() => setProject((p) => ({ ...p, buildings: [...p.buildings, defaultBuilding()] })), []);
  const addFloor = useCallback((bi: number) => setProject((p) => ({ ...p, buildings: p.buildings.map((bl, i) => i === bi ? { ...bl, floors: [...bl.floors, defaultFloor(`Floor ${bl.floors.length + 1}`, bl.floors.length)] } : bl) })), []);
  const addRoom = useCallback((bi: number, fi: number) => { const nr = defaultRoom(); setProject((p) => ({ ...p, buildings: p.buildings.map((b, bi2) => bi2 !== bi ? b : { ...b, floors: b.floors.map((fl, fi2) => fi2 !== fi ? fl : { ...fl, rooms: [...fl.rooms, nr] }) }) })); setActiveRoomId(nr.id); }, []);
  const updateRoom = useCallback((bi: number, fi: number, rid: string, upd: Partial<RoomData>) => setProject((p) => ({ ...p, buildings: p.buildings.map((b, bi2) => bi2 !== bi ? b : { ...b, floors: b.floors.map((fl, fi2) => fi2 !== fi ? fl : { ...fl, rooms: fl.rooms.map((r) => r.id !== rid ? r : { ...r, ...upd }) }) }) })), []);
  const deleteRoom = useCallback((bi: number, fi: number, rid: string) => { setProject((p) => ({ ...p, buildings: p.buildings.map((b, bi2) => bi2 !== bi ? b : { ...b, floors: b.floors.map((fl, fi2) => fi2 !== fi ? fl : { ...fl, rooms: fl.rooms.filter((r) => r.id !== rid) }) }) })); setActiveRoomId((prev) => (prev === rid ? null : prev)); }, []);
  const calculateProject = useCallback(async (scope?: ProjectEstimateScope) => {
    // The payload builder rejects anything event-shaped, so a SyntheticEvent
    // leaked through `onClick={calculateProject}` can never reach the request.
    setEstimate({ result: null, isCalculating: true, error: null });
    try {
      const result = await computeProjectEstimates(project, scope);
      setEstimate({ result, isCalculating: false, error: null });
    } catch (err) {
      // Safe error extraction: only use known properties
      const safeError = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Estimation failed';
      setEstimate({ result: null, isCalculating: false, error: safeError });
    }
  }, [project]);

  const activeBuilding = project.buildings[activeBuildingIdx] ?? null;
  const activeFloor = activeBuilding?.floors[activeFloorIdx] ?? null;
  const activeRoom = activeFloor?.rooms.find((r) => r.id === activeRoomId) ?? null;
  const totalRooms = project.buildings.reduce((s, b) => s + b.floors.reduce((sf, f) => sf + f.rooms.length, 0), 0);

  return { project, estimate, activeBuildingIdx, activeFloorIdx, activeRoomId, activeBuilding, activeFloor, activeRoom, totalRooms, renameProject, resetProject, addBuilding, addFloor, setActiveFloorIdx, addRoom, updateRoom, deleteRoom, setActiveRoomId, calculateProject };
}