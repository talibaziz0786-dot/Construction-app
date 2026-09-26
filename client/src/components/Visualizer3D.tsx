import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Center, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { FloorData } from '../hooks/useMultiRoomProject.js';
import { Eye, RotateCcw } from 'lucide-react';

interface Visualizer3DProps {
  floor: FloorData | null;
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

function HouseModel({ floor, activeRoomId, onSelectRoom }: { floor: FloorData | null; activeRoomId: string | null; onSelectRoom: (roomId: string) => void }) {
  const rooms = floor?.rooms ?? [];
  const roomNodes = rooms.map((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return { room: r, xOffset: (col - 1) * 6, zOffset: (row - 1) * 6 };
  });

  return (
    <group position={[0, 0, 0]}>
      {roomNodes.map(({ room, xOffset, zOffset }) => {
        const isSelected = room.id === activeRoomId;
        const l = room.lengthMeters;
        const w = room.widthMeters;
        const h = room.wallHeightMeters;
        const t = room.wallThicknessMeters;
        const halfL = l / 2;
        const halfW = w / 2;

        return (
          <group key={room.id} position={[xOffset, 0, zOffset]} onClick={(e) => { e.stopPropagation(); onSelectRoom(room.id); }}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <planeGeometry args={[l, w]} />
              <meshStandardMaterial color={isSelected ? '#b45309' : '#334155'} roughness={0.8} />
            </mesh>
            <mesh position={[0, h / 2, -halfW + t / 2]}>
              <boxGeometry args={[l, h, t]} />
              <meshStandardMaterial color={isSelected ? '#f59e0b' : '#64748b'} roughness={0.7} />
            </mesh>
            <mesh position={[0, h / 2, halfW - t / 2]}>
              <boxGeometry args={[l, h, t]} />
              <meshStandardMaterial color={isSelected ? '#f59e0b' : '#64748b'} roughness={0.7} />
            </mesh>
            <mesh position={[halfL - t / 2, h / 2, 0]}>
              <boxGeometry args={[t, h, w - t * 2]} />
              <meshStandardMaterial color={isSelected ? '#f59e0b' : '#475569'} roughness={0.7} />
            </mesh>
            <mesh position={[-halfL + t / 2, h / 2, 0]}>
              <boxGeometry args={[t, h, w - t * 2]} />
              <meshStandardMaterial color={isSelected ? '#f59e0b' : '#475569'} roughness={0.7} />
            </mesh>
            {room.openings.map((op, idx) => {
              const isDoor = op.type === 'door';
              const yPos = isDoor ? op.heightMeters / 2 : op.heightMeters / 2 + 0.9;
              const xPos = -halfL + (l / (room.openings.length + 1)) * (idx + 1);
              return (
                <group key={op.id} position={[xPos, yPos, -halfW]}>
                  <mesh>
                    <boxGeometry args={[op.widthMeters, op.heightMeters, t * 1.2]} />
                    <meshStandardMaterial color={isDoor ? '#10b981' : '#38bdf8'} transparent opacity={0.7} roughness={0.2} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

export const Visualizer3D: React.FC<Visualizer3DProps> = ({ floor, activeRoomId, onSelectRoom }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [wireframe, setWireframe] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Full House 3D Interactive Model</h2>
          <p className="text-xs text-slate-400">Multi-room spatial visualizer ({floor?.name ?? 'Ground Floor'})</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWireframe(!wireframe)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>{wireframe ? 'Solid Mode' : 'Wireframe'}</span>
          </button>
          <button onClick={() => controlsRef.current?.reset()} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700">
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Reset View</span>
          </button>
        </div>
      </div>
      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden w-full h-[500px] relative">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={50} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[15, 25, 20]} intensity={1.2} castShadow />
          <Center>
            <HouseModel floor={floor} activeRoomId={activeRoomId} onSelectRoom={onSelectRoom} />
          </Center>
          <Grid position={[0, -0.01, 0]} args={[40, 40]} cellSize={1} cellColor="#334155" sectionSize={5} sectionColor="#475569" />
          <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate maxPolarAngle={Math.PI / 2 - 0.05} minDistance={3} maxDistance={45} />
        </Canvas>
        <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 pointer-events-none">
          Rotate: Left Click + Drag | Pan: Right Click + Drag | Zoom: Scroll | Click room to select
        </div>
      </div>
    </div>
  );
};

