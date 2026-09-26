import { useState, useEffect } from 'react';
import type { Project, RoomGeometry } from '../types/project.js';

const DEFAULT_GEOMETRY: RoomGeometry = {
  lengthMeters: 5.0,
  widthMeters: 4.0,
  wallHeightMeters: 3.0,
  wallThicknessMeters: 0.23,
  openings: [
    { id: 'd1', type: 'door', widthMeters: 1.0, heightMeters: 2.1, quantity: 1 },
    { id: 'w1', type: 'window', widthMeters: 1.5, heightMeters: 1.2, quantity: 2 },
  ],
  brickLengthMeters: 0.19,
  brickWidthMeters: 0.09,
  brickHeightMeters: 0.09,
  mortarJointThicknessMeters: 0.01,
  wastagePercentage: 5,
};

const DEFAULT_PROJECT: Project = {
  id: 'proj-1',
  name: 'Sample Living Room',
  type: 'room',
  createdAt: new Date().toISOString(),
  geometry: DEFAULT_GEOMETRY,
};

export function useProject() {
  const [project, setProject] = useState<Project>(() => {
    const saved = localStorage.getItem('active_project');
    return saved ? JSON.parse(saved) : DEFAULT_PROJECT;
  });

  useEffect(() => {
    localStorage.setItem('active_project', JSON.stringify(project));
  }, [project]);

  const updateGeometry = (updates: Partial<RoomGeometry>) => {
    setProject((prev) => {
      const currentGeo = prev.geometry || DEFAULT_GEOMETRY;
      return {
        ...prev,
        geometry: {
          ...currentGeo,
          ...updates,
        },
      };
    });
  };

  const setProjectDetails = (name: string, type: Project['type']) => {
    setProject((prev) => ({
      ...prev,
      name,
      type,
    }));
  };

  return {
    project,
    geometry: project.geometry,
    updateGeometry,
    setProjectDetails,
  };
}
