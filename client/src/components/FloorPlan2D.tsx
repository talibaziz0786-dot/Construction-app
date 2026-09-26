import React from 'react';
import type { FloorData } from '../hooks/useMultiRoomProject.js';

interface FloorPlan2DProps {
  floor: FloorData | null;
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export const FloorPlan2D: React.FC<FloorPlan2DProps> = ({ floor, activeRoomId, onSelectRoom }) => {
  const rooms = floor?.rooms ?? [];
  const svgWidth = 800;
  const svgHeight = 600;
  const padding = 60;

  const roomLayouts = rooms.map((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return { room: r, w: r.lengthMeters, h: r.widthMeters, col, row };
  });

  const maxColW = [0, 0, 0];
  const maxRowH = [0, 0, 0];
  roomLayouts.forEach(item => {
    maxColW[item.col] = Math.max(maxColW[item.col], item.w);
    maxRowH[item.row] = Math.max(maxRowH[item.row], item.h);
  });

  const totalLayoutW = maxColW.reduce((a, b) => a + b, 0) || 5;
  const totalLayoutH = maxRowH.reduce((a, b) => a + b, 0) || 5;

  const scale = Math.min(
    (svgWidth - padding * 2) / (totalLayoutW + 2),
    (svgHeight - padding * 2) / (totalLayoutH + 2)
  );

  const positionedRooms = roomLayouts.map((item) => {
    const pixelW = item.w * scale;
    const pixelH = item.h * scale;

    let x = padding + 40;
    for (let c = 0; c < item.col; c++) {
      x += maxColW[c] * scale + 30;
    }
    let y = padding + 40;
    for (let r = 0; r < item.row; r++) {
      y += maxRowH[r] * scale + 30;
    }

    return { ...item, x, y, pixelW, pixelH };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Full House 2D Synchronized Floor Plan</h2>
          <p className="text-xs text-slate-400">Interactive multi-room layout ({floor?.name ?? 'Ground Floor'})</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-3 bg-slate-700 border border-slate-600 rounded"></span> Wall
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-3 bg-amber-500 rounded"></span> Selected Room
          </span>
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden w-full flex justify-center p-4">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[800px] h-auto">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {positionedRooms.length === 0 ? (
            <text x={svgWidth / 2} y={svgHeight / 2} fill="#64748b" fontSize="16" textAnchor="middle">
              No rooms on this floor. Add rooms to view 2D layout.
            </text>
          ) : (
            positionedRooms.map(({ room, x, y, pixelW, pixelH }) => {
              const isSelected = room.id === activeRoomId;
              const wallThick = Math.max(4, room.wallThicknessMeters * scale);

              return (
                <g key={room.id} onClick={() => onSelectRoom(room.id)} className="cursor-pointer group">
                  <rect
                    x={x - wallThick}
                    y={y - wallThick}
                    width={pixelW + wallThick * 2}
                    height={pixelH + wallThick * 2}
                    rx={6}
                    fill={isSelected ? '#d97706' : '#334155'}
                    stroke={isSelected ? '#f59e0b' : '#475569'}
                    strokeWidth={isSelected ? '3' : '1.5'}
                  />
                  <rect x={x} y={y} width={pixelW} height={pixelH} fill={isSelected ? '#1e293b' : '#0f172a'} />

                  {room.openings.map((op, idx) => {
                    const opW = Math.max(15, op.widthMeters * scale);
                    const opX = x + (pixelW / (room.openings.length + 1)) * (idx + 1) - opW / 2;
                    return (
                      <rect
                        key={op.id}
                        x={opX}
                        y={y - wallThick - 1}
                        width={opW}
                        height={wallThick + 2}
                        fill={op.type === 'door' ? '#10b981' : '#38bdf8'}
                        rx={2}
                      />
                    );
                  })}

                  <text x={x + pixelW / 2} y={y + pixelH / 2 - 6} fill="#f8fafc" fontSize="13" fontWeight="600" textAnchor="middle">
                    {room.name}
                  </text>
                  <text x={x + pixelW / 2} y={y + pixelH / 2 + 12} fill="#94a3b8" fontSize="11" textAnchor="middle">
                    {room.lengthMeters}m × {room.widthMeters}m
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
};

