/**
 * Cached hub fallback — bundled defaults so the hub renders offline.
 * The last good server catalog overwrites this cache when online.
 */
import type { CalculatorHubCategory } from '../types/calculator';

const BUNDLED_HUB: CalculatorHubCategory[] = [
  {
    id: 'area', name: 'Area & Surfaces',
    summary: 'Floor area and wall surface area with opening deductions.',
    calculators: [
      {
        calculatorId: 'room.floor-area', name: 'Room Floor Area', category: 'area',
        summary: 'Floor area of a rectangular room.',
        status: 'available',
        fields: [
          { name: 'length', label: 'Room length', kind: 'measurement', unit: 'm', min: 0.1, max: 500, step: 0.05, defaultValue: 3.05, isLength: true },
          { name: 'width', label: 'Room width', kind: 'measurement', unit: 'm', min: 0.1, max: 500, step: 0.05, defaultValue: 3.05, isLength: true },
        ],
      },
      {
        calculatorId: 'wall.net-area', name: 'Wall Area', category: 'area',
        summary: 'Gross wall area, openings and net area.',
        status: 'available',
        fields: [
          { name: 'wallLength', label: 'Wall length', kind: 'measurement', unit: 'm', min: 0.1, max: 500, step: 0.05, defaultValue: 3.05, isLength: true },
          { name: 'wallHeight', label: 'Wall height', kind: 'measurement', unit: 'm', min: 0.5, max: 30, step: 0.05, defaultValue: 3, isLength: true },
          { name: 'openings', label: 'Openings', kind: 'openings', unit: null, min: 0, max: 50, step: 1, defaultValue: 0, isLength: false },
        ],
      },
    ],
  },
  {
    id: 'masonry', name: 'Masonry',
    summary: 'Brick quantity from verified masonry volume.',
    calculators: [
      {
        calculatorId: 'masonry.brick-quantity', name: 'Brick Masonry', category: 'masonry',
        summary: 'Brick quantity for a wall with wastage.',
        status: 'available',
        fields: [
          { name: 'wallLength', label: 'Wall length', kind: 'measurement', unit: 'm', min: 0.1, max: 500, step: 0.05, defaultValue: 3.05, isLength: true },
          { name: 'wallHeight', label: 'Wall height', kind: 'measurement', unit: 'm', min: 0.5, max: 30, step: 0.05, defaultValue: 3, isLength: true },
          { name: 'wallThickness', label: 'Wall thickness', kind: 'measurement', unit: 'm', min: 0.05, max: 2, step: 0.01, defaultValue: 0.23, isLength: true },
          { name: 'openings', label: 'Openings', kind: 'openings', unit: null, min: 0, max: 50, step: 1, defaultValue: 0, isLength: false },
          { name: 'wastagePercentage', label: 'Wastage', kind: 'percentage', unit: null, min: 0, max: 50, step: 0.5, defaultValue: 5, isLength: false },
        ],
      },
    ],
  },
  {
    id: 'concrete', name: 'Concrete',
    summary: 'Concrete volume with wastage allowance.',
    calculators: [
      {
        calculatorId: 'concrete.volume', name: 'Concrete Volume', category: 'concrete',
        summary: 'Concrete volume for a slab or pour.',
        status: 'available',
        fields: [
          { name: 'length', label: 'Length', kind: 'measurement', unit: 'm', min: 0.05, max: 500, step: 0.05, defaultValue: 3, isLength: true },
          { name: 'width', label: 'Width', kind: 'measurement', unit: 'm', min: 0.05, max: 500, step: 0.05, defaultValue: 4, isLength: true },
          { name: 'depth', label: 'Depth', kind: 'measurement', unit: 'm', min: 0.02, max: 20, step: 0.01, defaultValue: 0.15, isLength: true },
          { name: 'wastagePercentage', label: 'Wastage', kind: 'percentage', unit: null, min: 0, max: 50, step: 0.5, defaultValue: 5, isLength: false },
        ],
      },
    ],
  },
  {
    id: 'finishing', name: 'Finishing',
    summary: 'Plaster volume and tile coverage.',
    calculators: [],
  },
];

export function bundledHub(): CalculatorHubCategory[] {
  return BUNDLED_HUB;
}
