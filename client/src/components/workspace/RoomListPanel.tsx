import React from 'react';
import { Plus, Trash2, Home, ChevronRight } from 'lucide-react';
import type { BuildingData, FloorData, RoomData } from '../../hooks/useMultiRoomProject.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { formatFtIn } from '../../utils/friendlyUnits.js';

interface RoomListPanelProps {
  building: BuildingData | null;
  floor: FloorData | null;
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onAddRoom: () => void;
  onAddFloor: () => void;
  onDeleteRoom: (roomId: string) => void;
  onSwitchFloor: (idx: number) => void;
}

export function RoomListPanel({
  building, floor, activeRoomId, onSelectRoom, onAddRoom, onAddFloor, onDeleteRoom, onSwitchFloor,
}: RoomListPanelProps) {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
      {/* Floor Selector */}
      {building && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{t('workspaceFloors')}</p>
          <div className="flex flex-wrap gap-1.5">
            {building.floors.map((f, i) => (
              <button
                key={f.id}
                onClick={() => onSwitchFloor(i)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  floor?.id === f.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.name}
                <span className="text-[10px] opacity-70">({f.rooms.length})</span>
              </button>
            ))}
            <button
              onClick={onAddFloor}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-dashed border-slate-600"
              aria-label={t('workspaceAddFloor')}
            >
              <Plus className="w-3.5 h-3.5" /> {t('workspaceAddFloor')}
            </button>
          </div>
        </div>
      )}

      {/* Rooms */}
      {floor && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('workspaceRooms')}</p>
            <button
              onClick={onAddRoom}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950"
              aria-label={t('workspaceAddRoom')}
            >
              <Plus className="w-3.5 h-3.5" /> {t('workspaceAddRoom')}
            </button>
          </div>

          {floor.rooms.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-slate-700 rounded-xl">
              <Home className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{t('workspaceNoRooms')}</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {floor.rooms.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => onSelectRoom(r.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition ${
                      activeRoomId === r.id
                        ? 'bg-amber-500/10 border border-amber-500/30 text-slate-100'
                        : 'bg-slate-800/40 border border-slate-700/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${activeRoomId === r.id ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="truncate font-medium">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-500">
                        {formatFtIn(r.lengthMeters)} × {formatFtIn(r.widthMeters)}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onDeleteRoom(r.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDeleteRoom(r.id); } }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        aria-label={`${t('workspaceDeleteRoomConfirm')} ${r.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}