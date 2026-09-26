import { describe, it, expect } from 'vitest';
import { convert } from '../units/conversion';
import { Unit } from '../units/types';

describe('Unit Conversion', () => {
  it('should convert mm to m', () => {
    expect(convert(1000, Unit.MM, Unit.M)).toBe(1);
  });

  it('should convert ft to m', () => {
    expect(convert(1, Unit.FT, Unit.M)).toBeCloseTo(0.3048);
  });

  it('should convert sq.ft to sq.m', () => {
    expect(convert(1, Unit.SQ_FT, Unit.SQ_M)).toBeCloseTo(0.092903);
  });

  it('should throw on dimension mismatch', () => {
    expect(() => convert(1, Unit.M, Unit.KG)).toThrow();
  });
});
