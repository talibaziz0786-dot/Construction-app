import React, { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout, Box, Building2, Calculator, Save, LogIn, UserPlus, Loader2, Ruler } from 'lucide-react';
import { useMultiRoomProject } from '../../hooks/useMultiRoomProject.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { RoomListPanel } from './RoomListPanel.js';
import { HouseSummary } from './HouseSummary.js';
import { DimensionsForm } from '../DimensionsForm.js';
import { FloorPlan2D } from '../FloorPlan2D.js';
import type { RoomGeometry } from '../../types/project.js';
import type { LengthUnit } from '../../types/unit-types.js';
import { apiUrl } from '../../services/apiBase.js';

const V3D = lazy(() => import('../Visualizer3D.js').then((m) => ({ default: m.Visualizer3D })));
type Tab = 'rooms' | 'editor' | '2d' | '3d' | 'summary' | 'calculators';
export function ProjectWorkspace() {
  const H = useMultiRoomProject();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { system, setSystem, lengthUnit, setLengthUnit } = useUnit();
  const { lang, t } = useLanguage();
  const { project, estimate, activeBuildingIdx, activeFloorIdx, activeRoomId, activeBuilding, activeFloor, activeRoom, totalRooms, renameProject, addFloor, setActiveFloorIdx, addRoom, updateRoom, deleteRoom, setActiveRoomId, calculateProject } = H;
  const [tab, setTab] = useState<Tab>('rooms');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [estimationScope, setEstimationScope] = useState<'single-wall' | 'selected-walls' | 'room' | 'project'>('room');
  const [selectedWallIds, setSelectedWallIds] = useState<string[]>([]);

  // When active room changes, default selectedWallIds to all 4 walls of activeRoom
  useEffect(() => {
    if (activeRoom) {
      setSelectedWallIds([
        `${activeRoom.id}-north`,
        `${activeRoom.id}-south`,
        `${activeRoom.id}-east`,
        `${activeRoom.id}-west`,
      ]);
    }
  }, [activeRoomId]);

  const handleScopeChange = useCallback((scope: 'single-wall' | 'selected-walls' | 'room' | 'project') => {
    setEstimationScope(scope);
    if (scope === 'single-wall' && activeRoom && selectedWallIds.length !== 1) {
      setSelectedWallIds([`${activeRoom.id}-north`]);
    } else if ((scope === 'room' || scope === 'project') && activeRoom) {
      setSelectedWallIds([
        `${activeRoom.id}-north`,
        `${activeRoom.id}-south`,
        `${activeRoom.id}-east`,
        `${activeRoom.id}-west`,
      ]);
    }
  }, [activeRoom, selectedWallIds.length]);

  const handleToggleWall = useCallback((wallId: string) => {
    setSelectedWallIds((prev) => {
      if (estimationScope === 'single-wall') {
        return [wallId];
      }
      if (prev.includes(wallId)) {
        if (prev.length === 1) return prev; // Keep at least 1
        return prev.filter((id) => id !== wallId);
      } else {
        return [...prev, wallId];
      }
    });
  }, [estimationScope]);

  const handleSelectAllWalls = useCallback(() => {
    if (activeRoom) {
      setSelectedWallIds([
        `${activeRoom.id}-north`,
        `${activeRoom.id}-south`,
        `${activeRoom.id}-east`,
        `${activeRoom.id}-west`,
      ]);
    }
  }, [activeRoom]);

  const handleClearWalls = useCallback(() => {
    if (activeRoom) {
      setSelectedWallIds([`${activeRoom.id}-north`]);
    }
  }, [activeRoom]);

  const handleCalculateWithScope = useCallback(() => {
    calculateProject({ estimationScope, selectedWallIds });
  }, [calculateProject, estimationScope, selectedWallIds]);
  const ar = useCallback(() => { if (activeBuilding && activeFloor) { addRoom(activeBuildingIdx, activeFloorIdx); setTab('editor'); } }, [activeBuilding, activeFloor, activeBuildingIdx, activeFloorIdx, addRoom]);
  const sr = useCallback((u: Partial<RoomGeometry>) => { if (activeFloor && activeRoomId) updateRoom(activeBuildingIdx, activeFloorIdx, activeRoomId, u); }, [activeBuildingIdx, activeFloorIdx, activeRoomId, activeFloor, updateRoom]);
  const dr = useCallback((rid: string) => { if (confirm(t('workspaceDeleteRoomConfirm'))) deleteRoom(activeBuildingIdx, activeFloorIdx, rid); }, [activeBuildingIdx, activeFloorIdx, deleteRoom, t]);
  const handleSave = useCallback(async () => {
    setSaving(true); setSaveMsg(null);
    try { const res = await fetch(apiUrl('/projects'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) }); if (!res.ok) throw new Error('Save failed'); setSaveMsg('Project saved!'); setTimeout(() => setSaveMsg(null), 3000); } catch (err) { setSaveMsg(err instanceof Error ? err.message : 'Save failed'); } finally { setSaving(false); }
  }, [project]);
  const geo: RoomGeometry | null = activeRoom ? { lengthMeters: activeRoom.lengthMeters, widthMeters: activeRoom.widthMeters, wallHeightMeters: activeRoom.wallHeightMeters, wallThicknessMeters: activeRoom.wallThicknessMeters, openings: activeRoom.openings, brickLengthMeters: activeRoom.brickLengthMeters, brickWidthMeters: activeRoom.brickWidthMeters, brickHeightMeters: activeRoom.brickHeightMeters, mortarJointThicknessMeters: activeRoom.mortarJointThicknessMeters, wastagePercentage: activeRoom.wastagePercentage } : null;
  const roomIds: string[] = activeFloor?.rooms.map((r: { id: string }) => r.id) ?? [];
  const tabs = [
    { k: 'rooms' as Tab, l: t('workspaceRooms'), i: <Layout className="w-4 h-4" /> },
    { k: 'editor' as Tab, l: t('workspaceDimensions'), i: <Box className="w-4 h-4" /> },
    { k: '2d' as Tab, l: lang === 'hi' ? '2D नक्शा (2D Plan)' : '2D Plan', i: <Box className="w-4 h-4" /> },
    { k: '3d' as Tab, l: lang === 'hi' ? '3D दृश्य (3D View)' : '3D View', i: <Building2 className="w-4 h-4" /> },
    { k: 'summary' as Tab, l: t('workspaceEstimate'), i: <Calculator className="w-4 h-4" /> },
    { k: 'calculators' as Tab, l: lang === 'hi' ? 'कैलकुलेटर (Calculator Hub)' : 'Calculator Hub', i: <Ruler className="w-4 h-4" /> },
  ];

  const calculatorHubItems = [
    { id: 'brick', titleEn: 'Bricks', titleHi: 'ईंट (Bricks)', desc: 'Masonry brick count, mortar volume & wastage calculations.', status: 'Available', icon: '🧱', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { id: 'wall', titleEn: 'Wall', titleHi: 'दीवार (Wall)', desc: 'Net wall area after door and window deduction calculations.', status: 'Available', icon: '🧱', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { id: 'plaster', titleEn: 'Plaster', titleHi: 'प्लास्टर (Plaster)', desc: 'Surface plaster volume and mortar quantity estimation.', status: 'Available', icon: '🪣', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { id: 'concrete', titleEn: 'Concrete', titleHi: 'कंक्रीट (Concrete)', desc: 'Slab, footing or beam concrete volume calculations.', status: 'Available', icon: '🏗️', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { id: 'tiles', titleEn: 'Tiles', titleHi: 'टाइल (Tiles)', desc: 'Floor tile count and wastage percentage estimation.', status: 'Available', icon: '◼️', badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    { id: 'floor', titleEn: 'Floor', titleHi: 'फर्श (Floor)', desc: 'Multi-room foundation and floor area summation.', status: 'Coming Soon', icon: '🏠', badgeColor: 'bg-slate-800 text-slate-400 border-slate-700' },
    { id: 'roof', titleEn: 'Roof', titleHi: 'छत (Roof)', desc: 'Roof slab, waterproofing and truss calculations.', status: 'Coming Soon', icon: '🏠', badgeColor: 'bg-slate-800 text-slate-400 border-slate-700' },
  ];
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shadow-md z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500 text-slate-950 p-2 rounded-lg font-bold"><Building2 className="w-5 h-5" /></div>
              <div><h1 className="text-lg font-bold text-slate-100 leading-none">{t('workspaceTitle')}</h1><p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{project.name} · {totalRooms} {lang === 'hi' ? 'कमरे' : `room${totalRooms !== 1 ? 's' : ''}`}</p></div>
            </div>

            {/* Global Visible Unit Selector as requested */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner">
              <div className="text-right">
                <span className="block text-[10px] text-amber-400 font-semibold tracking-wide">
                  गणना की इकाई (Calculation Unit)
                </span>
              </div>
              <select
                value={lengthUnit}
                onChange={(e) => {
                  const val = e.target.value as LengthUnit;
                  setLengthUnit(val);
                }}
                className="bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-100 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                aria-label="Calculation Unit"
              >
                <option value="ft">Feet (ft)</option>
                <option value="m">Meter (m)</option>
                <option value="cm">Centimeter (cm)</option>
                <option value="mm">Millimeter (mm)</option>
                <option value="in">Inch (in)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className={`text-xs ${saveMsg.includes('failed') ? 'text-red-400' : 'text-emerald-400'}`}>{saveMsg}</span>}
            {isAuthenticated && <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{lang === 'hi' ? 'सहेजें' : 'Save'}</button>}
            {!authLoading && !isAuthenticated && <div className="flex items-center gap-1.5"><Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition"><LogIn className="w-3.5 h-3.5" />{t('navSignIn')}</Link><Link to="/signup" className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition"><UserPlus className="w-3.5 h-3.5" />{lang === 'hi' ? 'प्रोजेक्ट सहेजें' : 'Save Project'}</Link></div>}
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0">{tabs.map((td) => <button key={td.k} onClick={() => setTab(td.k)} disabled={td.k === 'editor' && !activeRoomId} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${tab === td.k ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold' : td.k === 'editor' && !activeRoomId ? 'opacity-30 cursor-not-allowed text-slate-500' : 'text-slate-400 hover:text-slate-200'}`} aria-current={tab === td.k ? 'page' : undefined}>{td.i}<span className="hidden sm:inline">{td.l}</span></button>)}</nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {tab === 'rooms' && <div className="space-y-6"><div className="flex items-center gap-3"><label htmlFor="proj-name" className="text-sm text-slate-400 font-medium shrink-0">{t('workspaceProjectName')}</label><input id="proj-name" type="text" value={project.name} onChange={(e) => renameProject(e.target.value)} className="flex-1 max-w-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" maxLength={150} /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-1"><RoomListPanel building={activeBuilding} floor={activeFloor} activeRoomId={activeRoomId} onSelectRoom={(id) => { setActiveRoomId(id); setTab('editor'); }} onAddRoom={ar} onAddFloor={() => addFloor(activeBuildingIdx)} onDeleteRoom={dr} onSwitchFloor={setActiveFloorIdx} /></div><div className="lg:col-span-2"><div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4"><HouseSummary totalRooms={totalRooms} projectName={project.name} estimate={estimate} onCalculate={calculateProject} roomsNeedingCalc={roomIds} /></div></div></div></div>}
        {tab === 'editor' && activeRoom && geo && (
          <div className="space-y-6">
            <DimensionsForm
              roomId={activeRoom.id}
              geometry={geo}
              onChange={sr}
              estimationScope={estimationScope}
              selectedWallIds={selectedWallIds}
              onScopeChange={handleScopeChange}
              onToggleWall={handleToggleWall}
              onSelectAllWalls={handleSelectAllWalls}
              onClearWalls={handleClearWalls}
            />
            <div className="flex justify-end pt-4">
              <button
                onClick={handleCalculateWithScope}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg shadow-lg"
              >
                {lang === 'hi' ? 'चुने हुए हिस्से का अनुमान (Estimate Selection)' : t('workspaceEstimateSelection')}
              </button>
            </div>
          </div>
        )}
        {tab === 'editor' && !activeRoom && <div className="flex flex-col items-center justify-center py-20 text-center"><Box className="w-12 h-12 text-slate-600 mb-4" /><p className="text-slate-400 text-lg font-medium">{lang === 'hi' ? 'कोई कमरा चुना नहीं गया' : 'No room selected'}</p><p className="text-slate-500 text-sm mt-1">{lang === 'hi' ? 'माप बदलने के लिए कमरे टैब से कमरा चुनें' : 'Select a room from the Rooms tab to edit dimensions'}</p><button onClick={() => setTab('rooms')} className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg">{lang === 'hi' ? 'कमरों पर जाएं' : 'Go to Rooms'}</button></div>}
        {tab === '2d' && <FloorPlan2D floor={activeFloor} activeRoomId={activeRoomId} onSelectRoom={(id) => { setActiveRoomId(id); setTab('editor'); }} />}
        {tab === '2d' && !activeFloor && <div className="flex flex-col items-center justify-center py-20 text-center"><Box className="w-12 h-12 text-slate-600 mb-4" /><p className="text-slate-400">{t('workspaceSelectFloor2d')}</p></div>}
        {tab === '3d' && activeFloor && <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-pulse text-slate-400">{t('workspaceLoading3d')}</div></div>}><V3D floor={activeFloor} activeRoomId={activeRoomId} onSelectRoom={(id) => { setActiveRoomId(id); setTab('editor'); }} /></Suspense>}
        {tab === '3d' && !activeFloor && <div className="flex flex-col items-center justify-center py-20 text-center"><Building2 className="w-12 h-12 text-slate-600 mb-4" /><p className="text-slate-400">{t('workspaceSelectFloor3d')}</p></div>}
        {tab === 'summary' && <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"><HouseSummary totalRooms={totalRooms} projectName={project.name} estimate={estimate} onCalculate={calculateProject} roomsNeedingCalc={roomIds} /></div>}
      </main>
    </div>
  );
}