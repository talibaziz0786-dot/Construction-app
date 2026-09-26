import { describe, it, expect } from 'vitest';
import { BoqBuilder, createBoqItem, createBoqSection } from './boq.js';
import { Unit } from './units/types.js';
import { SupportedMaterialCategory } from './project/RateCard.js';

const baseItem = {
  id: 'brick-1',
  category: 'brick' as SupportedMaterialCategory,
  description: 'Standard clay brick',
  quantity: 4417,
  unit: Unit.PIECE,
  currency: 'USD',
  theoreticalQuantity: 4206,
  procurementQuantity: 4417,
  wastagePercentage: 5,
  sourceCalculatorId: 'masonry.brick-quantity',
  sourceMethodologyVersion: '1.0.0',
};

describe('BOQ domain', () => {
  it('marks a line rate-unavailable when no rate exists', () => {
    const item = createBoqItem({ ...baseItem, rate: null });

    expect(item.rate).toBeNull();
    expect(item.amount).toBeNull();
    expect(item.rateUnavailable).toBe(true);
    expect(item.warnings).toContain('Rate unavailable — amount not calculated');
  });

  it('never treats a zero or negative rate as a price', () => {
    expect(createBoqItem({ ...baseItem, rate: 0 }).rateUnavailable).toBe(true);
    expect(createBoqItem({ ...baseItem, rate: -5 }).rateUnavailable).toBe(true);
  });

  it('prices a line from a valid rate', () => {
    const item = createBoqItem({ ...baseItem, rate: 8 });

    expect(item.rateUnavailable).toBe(false);
    expect(item.amount).toBe(4417 * 8);
    expect(item.warnings).toEqual([]);
    expect(item.sourceCalculatorId).toBe('masonry.brick-quantity');
  });

  it('sums only priced lines and counts unavailable rates', () => {
    const section = createBoqSection({
      id: 'room-1',
      name: 'Living Room',
      currency: 'USD',
      items: [
        createBoqItem({ ...baseItem, rate: 8 }),
        createBoqItem({ ...baseItem, id: 'concrete-1', category: 'concrete', rate: null }),
      ],
    });

    expect(section.totalAmount).toBe(4417 * 8);
    expect(section.rateUnavailableCount).toBe(1);
  });

  it('builds a BOQ with derived totals and missing-rate flag', () => {
    const builder = new BoqBuilder();
    builder.addAssumption('Planning purposes only');
    builder.addWarning('Brick rate not configured');

    builder.addSection(
      createBoqSection({
        id: 'room-1',
        name: 'Living Room',
        currency: 'USD',
        items: [createBoqItem({ ...baseItem, rate: null })],
      })
    );

    const boq = builder.build('proj-1', 'Test House', 'USD');

    expect(boq.grandTotal).toBe(0);
    expect(boq.hasMissingRates).toBe(true);
    expect(boq.assumptions).toEqual(['Planning purposes only']);
    expect(boq.warnings).toEqual(['Brick rate not configured']);
  });

  it('rejects duplicate sections', () => {
    const builder = new BoqBuilder();
    const section = createBoqSection({ id: 'room-1', name: 'Living Room', currency: 'USD', items: [] });

    builder.addSection(section);

    expect(() => builder.addSection(section)).toThrowError(/already exists/);
  });
});
