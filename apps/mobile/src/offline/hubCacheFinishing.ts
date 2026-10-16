/**
 * Finishing hub entries + cache load/save (split to stay under edit limits).
 */
import type { CalculatorHubCategory } from '../types/calculator';
import { StorageKeys, storageGet, storageSet } from './storage';

export const FINISHING_HUB: CalculatorHubCategory = {
  id: 'finishing', name: 'Finishing',
  summary: 'Plaster volume and tile coverage.',
  calculators: [
    {
      calculatorId: 'plaster.quantity', name: 'Plaster', category: 'finishing',
      summary: 'Cement plaster volume for a surface area.',
      status: 'available',
      fields: [
        { name: 'netSurfaceArea', label: 'Surface area', kind: 'measurement', unit: 'sq.m', min: 0.5, max: 5000, step: 0.1, defaultValue: 30, isLength: false },
        { name: 'plasterThickness', label: 'Thickness', kind: 'measurement', unit: 'm', min: 0.005, max: 0.1, step: 0.001, defaultValue: 0.012, isLength: true },
        { name: 'wastagePercentage', label: 'Wastage', kind: 'percentage', unit: null, min: 0, max: 50, step: 0.5, defaultValue: 5, isLength: false },
      ],
    },
    {
      calculatorId: 'tile.quantity', name: 'Floor Tiles', category: 'finishing',
      summary: 'Tile count for a rectangular floor.',
      status: 'available',
      fields: [
        { name: 'roomLength', label: 'Room length', kind: 'measurement', unit: 'm', min: 0.1, max: 500, step: 0.05, defaultValue: 3.05, isLength: true },
        { name: 'roomWidth', label: 'Room width', kind: 'measurement', unit: 'm', min: 0.1, max: 500, step: 0.05, defaultValue: 3.05, isLength: true },
        { name: 'tileLength', label: 'Tile length', kind: 'measurement', unit: 'm', min: 0.05, max: 3, step: 0.05, defaultValue: 0.6, isLength: true },
        { name: 'tileWidth', label: 'Tile width', kind: 'measurement', unit: 'm', min: 0.05, max: 3, step: 0.05, defaultValue: 0.6, isLength: true },
        { name: 'wastagePercentage', label: 'Wastage', kind: 'percentage', unit: null, min: 0, max: 50, step: 0.5, defaultValue: 7, isLength: false },
      ],
    },
  ],
};

export async function loadCachedHub(fallback: CalculatorHubCategory[]): Promise<CalculatorHubCategory[]> {
  const cached = await storageGet<CalculatorHubCategory[] | null>(StorageKeys.catalogCache, null);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  return fallback;
}

export async function saveHubCache(hub: CalculatorHubCategory[]): Promise<void> {
  await storageSet(StorageKeys.catalogCache, hub);
}
