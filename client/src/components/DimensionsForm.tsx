import React from 'react';
import type { RoomGeometry } from '../types/project.js';
import { RoomDimensionsCard } from './forms/RoomDimensionsCard.js';
import { OpeningsCard } from './forms/OpeningsCard.js';
import { BrickSpecsCard } from './forms/BrickSpecsCard.js';
import { WallSelectorCard } from './forms/WallSelectorCard.js';
import type { EstimationScopeType } from './forms/WallSelectorCard.js';

interface DimensionsFormProps {
  roomId: string;
  geometry: RoomGeometry;
  onChange: (updates: Partial<RoomGeometry>) => void;
  estimationScope: EstimationScopeType;
  selectedWallIds: string[];
  onScopeChange: (scope: EstimationScopeType) => void;
  onToggleWall: (wallId: string) => void;
  onSelectAllWalls: () => void;
  onClearWalls: () => void;
}

export const DimensionsForm: React.FC<DimensionsFormProps> = ({
  roomId,
  geometry,
  onChange,
  estimationScope,
  selectedWallIds,
  onScopeChange,
  onToggleWall,
  onSelectAllWalls,
  onClearWalls,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <WallSelectorCard
        roomId={roomId}
        geometry={geometry}
        estimationScope={estimationScope}
        selectedWallIds={selectedWallIds}
        onScopeChange={onScopeChange}
        onToggleWall={onToggleWall}
        onSelectAllWalls={onSelectAllWalls}
        onClearWalls={onClearWalls}
      />
      <RoomDimensionsCard geometry={geometry} onChange={onChange} />
      <OpeningsCard geometry={geometry} onChange={onChange} />
      <BrickSpecsCard geometry={geometry} onChange={onChange} />
    </div>
  );
};
