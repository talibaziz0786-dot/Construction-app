import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../../app.js';

/**
 * Calculator API integration tests.
 *
 * The brick scenario reproduces the documented methodology baseline:
 * 10 ft × 10 ft room → perimeter 12.192 m, height 3 m, wall thickness 0.23 m,
 * brick module 0.2 × 0.1 × 0.1 m (0.002 m³), 5% wastage → 4,417 bricks.
 */
describe('Calculator API (/api/calculators)', () => {
  it('lists available calculators and coming-soon entries', async () => {
    const res = await request(app).get('/api/calculators');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);

    const categories = res.body.categories as Array<{
      id: string;
      calculators: Array<{ calculatorId: string; status: string; fields: unknown[] }>;
    }>;

    const available = categories.flatMap((category) =>
      category.calculators.filter((calculator) => calculator.status === 'available')
    );
    const comingSoon = categories.flatMap((category) =>
      category.calculators.filter((calculator) => calculator.status === 'coming-soon')
    );

    expect(available.map((calculator) => calculator.calculatorId).sort()).toEqual([
      'concrete.volume',
      'masonry.brick-quantity',
      'plaster.quantity',
      'room.floor-area',
      'tile.quantity',
      'wall.net-area',
    ]);

    // Every available calculator must expose its input fields for the UI.
    for (const calculator of available) {
      expect(calculator.fields.length).toBeGreaterThan(0);
    }

    // Unverified calculators must never expose input fields or claim to be available.
    expect(comingSoon.length).toBeGreaterThan(0);
    for (const calculator of comingSoon) {
      expect(calculator.fields).toEqual([]);
    }
  });

  it('calculates the documented brick baseline (4,908 bricks)', async () => {
    const res = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({
        values: {
          wallLength: 12.192,
          wallHeight: 3,
          wallThickness: 0.23,
          openings: [],
          brickLength: 0.19,
          brickWidth: 0.09,
          brickHeight: 0.09,
          mortarJointThickness: 0.01,
          wastagePercentage: 5,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.primary.value).toBe(4908);
    expect(res.body.primary.unit).toBe('bricks');
    expect(res.body.composition.calculatorsUsed).toEqual([
      'wall.net-area',
      'masonry.brick-quantity',
    ]);
    expect(res.body.boq.sections[0].items[0].quantity).toBe(4908);
  });

  it('deducts openings from the wall area before the brick quantity', async () => {
    const withoutOpening = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({
        values: { wallLength: 12.192, wallHeight: 3, wallThickness: 0.23, openings: [] },
      });

    const withOpening = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({
        values: {
          wallLength: 12.192,
          wallHeight: 3,
          wallThickness: 0.23,
          openings: [{ type: 'door', width: 1, height: 2.1, quantity: 1 }],
        },
      });

    expect(withoutOpening.status).toBe(200);
    expect(withOpening.status).toBe(200);
    expect(withOpening.body.primary.value).toBeLessThan(withoutOpening.body.primary.value);
  });

  it('derives the floor area for the tile calculator through the composition', async () => {
    const res = await request(app)
      .post('/api/calculators/tile.quantity/calculate')
      .send({
        values: {
          roomLength: 3.048,
          roomWidth: 3.048,
          tileLength: 0.6,
          tileWidth: 0.6,
          wastagePercentage: 7,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.composition.calculatorsUsed).toEqual(['room.floor-area', 'tile.quantity']);
    // 3.048 × 3.048 = 9.290304 m², tile 0.36 m² → 25.8064 theoretical, +7% → 28 tiles
    expect(res.body.primary.value).toBe(28);
    expect(res.body.rows[0].value).toBeCloseTo(9.290304, 6);
  });

  it('reports a rate-unavailable BOQ when no rate is provided', async () => {
    const res = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({ values: { wallLength: 12.192, wallHeight: 3, wallThickness: 0.23, openings: [] } });

    expect(res.status).toBe(200);
    const item = res.body.boq.sections[0].items[0];
    expect(item.rate).toBeNull();
    expect(item.amount).toBeNull();
    expect(item.rateUnavailable).toBe(true);
    expect(res.body.boq.grandTotal).toBe(0);
    expect(res.body.boq.hasMissingRates).toBe(true);
  });

  it('prices the BOQ from a matching user-entered rate', async () => {
    const res = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({
        values: { wallLength: 12.192, wallHeight: 3, wallThickness: 0.23, openings: [] },
        rateCard: {
          currency: 'USD',
          entries: [{ category: 'brick', rate: 8, unit: 'nos', currency: 'USD' }],
        },
      });

    expect(res.status).toBe(200);
    const item = res.body.boq.sections[0].items[0];
    expect(item.rateUnavailable).toBe(false);
    expect(item.rate).toBe(8);
    expect(item.amount).toBe(4908 * 8);
    expect(res.body.boq.grandTotal).toBe(4908 * 8);
    expect(res.body.boq.hasMissingRates).toBe(false);
  });

  it('never prices a line from an incompatible rate unit', async () => {
    const res = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({
        values: { wallLength: 12.192, wallHeight: 3, wallThickness: 0.23, openings: [] },
        rateCard: { currency: 'USD', entries: [{ category: 'brick', rate: 8, unit: 'kg' }] },
      });

    expect(res.status).toBe(200);
    const item = res.body.boq.sections[0].items[0];
    expect(item.rate).toBeNull();
    expect(item.rateUnavailable).toBe(true);
    expect(res.body.boq.warnings.join(' ')).toContain('does not match the required unit');
  });

  it('rejects invalid calculator input with 400', async () => {
    const res = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({ values: { wallLength: 0, wallHeight: 3, wallThickness: 0.23 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects non numeric input values with 400', async () => {
    const res = await request(app)
      .post('/api/calculators/room.floor-area/calculate')
      .send({ values: { length: 'three', width: 3 } });

    expect(res.status).toBe(400);
  });

  it('rejects an unknown calculator with 404', async () => {
    const res = await request(app).post('/api/calculators/rcc.slab/calculate').send({ values: {} });

    expect(res.status).toBe(404);
  });

  it('accepts the loopback-alias dev origin (127.0.0.1) for calculation POSTs', async () => {
    // Regression: the browser origin http://127.0.0.1:5173 (same machine as
    // http://localhost:5173) must never be rejected by the CORS allowlist.
    // A rejection surfaces to the UI as a generic 500 "Internal server error".
    const res = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .set('Origin', 'http://127.0.0.1:5173')
      .send({
        values: {
          wallLength: 3.048,
          wallHeight: 3.048,
          wallThickness: 0.1016,
          openings: [],
          brickLength: 0.2286,
          brickWidth: 0.1016,
          brickHeight: 0.0889,
          mortarJointThickness: 0.0254,
          wastagePercentage: 5,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.primary.value).toBe(336);
  });

  it('calculates a room floor area without BOQ lines', async () => {
    const res = await request(app)
      .post('/api/calculators/room.floor-area/calculate')
      .send({ values: { length: 3.048, width: 3.048 } });

    expect(res.status).toBe(200);
    expect(res.body.primary.value).toBeCloseTo(9.290304, 6);
    expect(res.body.boq.sections[0].items).toEqual([]);
    expect(res.body.boq.hasMissingRates).toBe(false);
  });

  it('produces consistent plaster rows and BOQ quantities (100 sq ft x 1 in)', async () => {
    const res = await request(app)
      .post('/api/calculators/plaster.quantity/calculate')
      .send({ values: { netSurfaceArea: 9.290304, plasterThickness: 0.0254, wastagePercentage: 5 } });

    expect(res.status).toBe(200);
    const wetRow = res.body.rows.find((row: { label: string }) => row.label === 'Procurement volume (wet)');
    expect(wetRow.value).toBeCloseTo(0.247773, 5);
    const cementRow = res.body.rows.find((row: { label: string }) => String(row.label).startsWith('Cement required (mix'));
    expect(cementRow.value).toBeCloseTo(1.898, 2);
    const sandRow = res.body.rows.find((row: { label: string }) => row.label === 'Sand / balu required');
    expect(sandRow.value).toBeCloseTo(0.26363, 5);

    const items = res.body.boq.sections[0].items as Array<{ category: string; quantity: number; unit: string }>;
    expect(items).toHaveLength(3);
    const plasterLine = items.find((item) => item.category === 'plaster');
    const cementLine = items.find((item) => item.category === 'cement');
    const sandLine = items.find((item) => item.category === 'sand');
    expect(plasterLine?.quantity).toBeCloseTo(wetRow.value, 8);
    expect(plasterLine?.unit).toBe('cu.m');
    expect(cementLine?.quantity).toBeCloseTo(cementRow.value, 8);
    expect(cementLine?.unit).toBe('piece');
    expect(sandLine?.quantity).toBeCloseTo(sandRow.value, 8);
    expect(sandLine?.unit).toBe('cu.m');
    // The BOQ must carry the authoritative calculation quantity — never 0.2 cu.ft worth of cu.m.
    expect(plasterLine?.quantity).toBeGreaterThan(0.2);
  });

  it('exposes explicit brick trace rows with wastage kept separate', async () => {
    const res = await request(app)
      .post('/api/calculators/masonry.brick-quantity/calculate')
      .send({
        values: {
          wallLength: 3.048,
          wallHeight: 3.048,
          wallThickness: 0.1016,
          openings: [],
          brickLength: 0.2286,
          brickWidth: 0.1016,
          brickHeight: 0.0889,
          mortarJointThickness: 0.0254,
          wastagePercentage: 5,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.primary.value).toBe(336);
    const labels = (res.body.rows as Array<{ label: string }>).map((row) => row.label);
    expect(labels).toContain('Theoretical bricks');
    expect(labels).toContain('Bricks to purchase');
    expect(res.body.boq.sections[0].items[0].quantity).toBe(336);
  });
});
