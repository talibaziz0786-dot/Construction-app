import { describe, it, expect } from 'vitest';
import {
  CalculatorApiError,
  REQUIRED_LIVE_CALCULATORS,
  findMissingRequiredCalculators,
  normalizeHubCategories,
} from './calculatorService.js';
import { apiUrl, normalizeApiBase } from './apiBase.js';

const VALID_HUB = {
  categories: [
    {
      id: 'area',
      name: 'Area & Surfaces',
      summary: 'Floor area and wall surface area with opening deductions.',
      calculators: [
        {
          calculatorId: 'room.floor-area',
          name: 'Floor Area',
          category: 'area',
          summary: 'Room floor area.',
          status: 'available',
          fields: [{ name: 'length', label: 'Length', kind: 'measurement', unit: 'm', min: 0.1, max: 150, step: 0.1, defaultValue: 3, isLength: true }],
        },
        {
          calculatorId: 'wall.net-area',
          name: 'Wall Net Area',
          category: 'area',
          summary: 'Wall area less openings.',
          status: 'available',
          fields: [{ name: 'wallLength', label: 'Wall length', kind: 'measurement', unit: 'm', min: 0.1, max: 150, step: 0.1, defaultValue: 3, isLength: true }],
        },
      ],
    },
    {
      id: 'masonry',
      name: 'Masonry',
      summary: 'Brick quantity.',
      calculators: [
        {
          calculatorId: 'masonry.brick-quantity',
          name: 'Brick Masonry',
          category: 'masonry',
          summary: 'Brick quantity with wastage.',
          status: 'available',
          fields: [{ name: 'wallLength', label: 'Wall length', kind: 'measurement', unit: 'm', min: 0.1, max: 150, step: 0.1, defaultValue: 3, isLength: true }],
        },
      ],
    },
    {
      id: 'concrete',
      name: 'Concrete',
      summary: 'Concrete volume.',
      calculators: [
        { calculatorId: 'concrete.volume', name: 'Concrete Volume', category: 'concrete', summary: 'Volume.', status: 'available', fields: [{ name: 'length' }] },
      ],
    },
    {
      id: 'finishing',
      name: 'Finishing',
      summary: 'Plaster and tiles.',
      calculators: [
        { calculatorId: 'plaster.quantity', name: 'Plaster', category: 'finishing', summary: 'Plaster volume.', status: 'available', fields: [{ name: 'netSurfaceArea' }] },
        { calculatorId: 'tile.quantity', name: 'Tiles', category: 'finishing', summary: 'Tile count.', status: 'available', fields: [{ name: 'floorArea' }] },
      ],
    },
  ],
};

describe('apiBase', () => {
  it('normalizes a bare origin, an /api origin and an empty base', () => {
    expect(normalizeApiBase('https://api.example.com')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('https://api.example.com/api')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('https://api.example.com/api/')).toBe('https://api.example.com/api');
    expect(normalizeApiBase('')).toBe('/api');
  });

  it('builds same-origin paths for the dev proxy', () => {
    expect(apiUrl('/calculators')).toBe('/api/calculators');
    expect(apiUrl('projects/calculate')).toBe('/api/projects/calculate');
  });
});

describe('calculator hub contract', () => {
  it('keeps every valid calculator and exposes its input fields', () => {
    const categories = normalizeHubCategories(VALID_HUB);
    const available = categories.flatMap((category) => category.calculators);

    expect(available.map((entry) => entry.calculatorId).sort()).toEqual([
      'concrete.volume',
      'masonry.brick-quantity',
      'plaster.quantity',
      'room.floor-area',
      'tile.quantity',
      'wall.net-area',
    ]);
    expect(findMissingRequiredCalculators(categories)).toEqual([]);
    expect(available[0].fields.length).toBeGreaterThan(0);
  });

  it('reports exactly which required calculators are missing', () => {
    const partial = { categories: [VALID_HUB.categories[0]] };
    const categories = normalizeHubCategories(partial);

    expect(findMissingRequiredCalculators(categories)).toEqual([
      'masonry.brick-quantity',
      'concrete.volume',
      'plaster.quantity',
      'tile.quantity',
    ]);
  });

  it('drops malformed entries instead of throwing during render', () => {
    const categories = normalizeHubCategories({
      categories: [
        { id: 'area', name: 'Area', summary: '', calculators: [null, { name: 'No id' }, VALID_HUB.categories[0].calculators[0]] },
        { id: 'broken', name: 'Broken', summary: '', calculators: 'not-an-array' },
      ],
    });

    expect(categories).toHaveLength(1);
    expect(categories[0].calculators.map((entry) => entry.calculatorId)).toEqual(['room.floor-area']);
  });

  it('fails loudly (never blank) when the listing is unusable', () => {
    expect(() => normalizeHubCategories(null)).toThrow(CalculatorApiError);
    expect(() => normalizeHubCategories({})).toThrow('Calculator listing is malformed');
    expect(() => normalizeHubCategories({ categories: [] })).toThrow('empty or malformed');
    // An HTML shell returned with HTTP 200 (wrong API base) is not a listing.
    expect(() => normalizeHubCategories('<!doctype html>')).toThrow(CalculatorApiError);
  });

  it('lists all six live calculators as required', () => {
    expect([...REQUIRED_LIVE_CALCULATORS]).toEqual([
      'room.floor-area',
      'wall.net-area',
      'masonry.brick-quantity',
      'concrete.volume',
      'plaster.quantity',
      'tile.quantity',
    ]);
  });
});
