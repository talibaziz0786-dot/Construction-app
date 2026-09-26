import React from 'react';
import type { RoomGeometry } from '../../types/project.js';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { Layers, CheckSquare, Square, CheckCircle2, Compass } from 'lucide-react';
import { formatFtIn } from '../../utils/friendlyUnits.js';

export type EstimationScopeType = 'single-wall' | 'selected-walls' | 'room' | 'project';

interface Props {
  roomId: string;
  geometry: RoomGeometry;
  estimationScope: EstimationScopeType;
  selectedWallIds: string[];
  onScopeChange: (scope: EstimationScopeType) => void;
  onToggleWall: (wallId: string) => void;
  onSelectAllWalls: () => void;
  onClearWalls: () => void;
}

const WALL_NAMES: Record<string, { en: string; hi: string }> = {
  north: { en: 'North Wall', hi: 'उत्तर दीवार' },
  south: { en: 'South Wall', hi: 'दक्षिण दीवार' },
  east: { en: 'East Wall', hi: 'पूर्व दीवार' },
  west: { en: 'West Wall', hi: 'पश्चिम दीवार' },
};

export const WallSelectorCard: React.FC<Props> = ({
  roomId,
  geometry,
  estimationScope,
  selectedWallIds,
  onScopeChange,
  onToggleWall,
  onSelectAllWalls,
  onClearWalls,
}) => {
  const { formatArea } = useUnit();
  const { lang } = useLanguage();

  const walls = [
    { id: `${roomId}-north`, side: 'north', l: geometry.lengthMeters, h: geometry.wallHeightMeters },
    { id: `${roomId}-south`, side: 'south', l: geometry.lengthMeters, h: geometry.wallHeightMeters },
    { id: `${roomId}-east`, side: 'east', l: geometry.widthMeters, h: geometry.wallHeightMeters },
    { id: `${roomId}-west`, side: 'west', l: geometry.widthMeters, h: geometry.wallHeightMeters },
  ];

  const wallLabel = (side: string) => {
    const names = WALL_NAMES[side];
    if (!names) return side;
    return lang === 'hi' ? `${names.hi} / ${names.en}` : `${names.en} / ${names.hi}`;
  };

  const isSelective = estimationScope === 'single-wall' || estimationScope === 'selected-walls';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>{lang === 'hi' ? 'अनुमान का दायरा और दीवार चयन (Scope & Wall Selection)' : 'Estimation Scope & Wall Selection'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'hi' ? 'पूरे कमरे या चुनी हुई दीवारों (1-4) का अनुमान लगाएं' : 'Estimate complete room or specific walls (1-4)'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button type="button" onClick={() => onScopeChange('room')} className={`px-3 py-1.5 rounded-md font-medium transition ${!isSelective ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>{lang === 'hi' ? 'सभी दीवारें' : 'All Walls'}</button>
          <button type="button" onClick={() => onScopeChange('selected-walls')} className={`px-3 py-1.5 rounded-md font-medium transition ${estimationScope === 'selected-walls' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>{lang === 'hi' ? 'दीवारें चुनें' : 'Select Walls'}</button>
          <button type="button" onClick={() => onScopeChange('single-wall')} className={`px-3 py-1.5 rounded-md font-medium transition ${estimationScope === 'single-wall' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>{lang === 'hi' ? 'एक दीवार' : 'Single Wall'}</button>
        </div>
      </div>

      {isSelective ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">{lang === 'hi' ? 'चुनी गई:' : 'Selected:'} <span className="text-amber-400 font-semibold">{selectedWallIds.length} / 4</span></span>
            {estimationScope === 'selected-walls' && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={onSelectAllWalls} className="text-amber-400 hover:underline">{lang === 'hi' ? 'सभी चुनें' : 'Select All'}</button>
                <span className="text-slate-600">•</span>
                <button type="button" onClick={onClearWalls} className="text-slate-400 hover:underline">{lang === 'hi' ? 'हटाएं' : 'Clear'}</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {walls.map((w) => {
              const isSelected = selectedWallIds.includes(w.id);
              return (
                <div key={w.id} onClick={() => onToggleWall(w.id)} className={`cursor-pointer rounded-xl p-3 border transition flex items-start gap-3 select-none ${isSelected ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/30' : 'bg-slate-950/60 border-slate-800 opacity-70 hover:opacity-100'}`}>
                  <div className="mt-0.5 text-amber-400">{isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-100">{wallLabel(w.side)}</span>{isSelected && <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">{lang === 'hi' ? 'चुनी' : 'Active'}</span>}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div><span className="text-[10px] text-slate-500">{lang === 'hi' ? 'माप:' : 'Size:'}</span> {formatFtIn(w.l)} × {formatFtIn(w.h)}</div>
                      <div><span className="text-[10px] text-slate-500">{lang === 'hi' ? 'क्षेत्रफल:' : 'Area:'}</span> {formatArea(w.l * w.h)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex justify-between items-center">
          <span>{lang === 'hi' ? 'इस कमरे की सभी 4 दीवारों का अनुमान लगाया जा रहा है।' : 'Estimating all 4 walls for this room.'}</span>
          <span className="text-amber-400 font-medium">{lang === 'hi' ? '4 में से 4 दीवारें' : '4 of 4 walls'}</span>
        </div>
      )}
    </div>
  );
};