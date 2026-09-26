import { describe, it, expect } from 'vitest';
import {
  toMeters,
  fromMeters,
  toSqMeters,
  fromSqMeters,
  toCuMeters,
  fromCuMeters,
  roundTo,
  formatCount,
} from './unitConversion.js';

describe('Unit Conversion Utility', () => {
  describe('Length Conversion', () => {
    it('should convert feet to meters correctly', () => {
      const feet = 10;
      const meters = toMeters(feet, 'ft');
      expect(meters).toBeCloseTo(3.048, 4);
    });

    it('should convert meters to feet correctly', () => {
      const meters = 3.048;
      const feet = fromMeters(meters, 'ft', 2);
      expect(feet).toBe(10);
    });

    it('should convert centimeters to meters correctly', () => {
      expect(toMeters(19, 'cm')).toBeCloseTo(0.19, 4);
      expect(fromMeters(0.19, 'cm', 1)).toBe(19);
    });

    it('should convert millimeters to meters correctly', () => {
      expect(toMeters(1000, 'mm')).toBe(1);
      expect(fromMeters(1, 'mm')).toBe(1000);
    });

    it('should convert inches to meters correctly', () => {
      expect(toMeters(12, 'in')).toBeCloseTo(0.3048, 4);
      expect(fromMeters(0.3048, 'in', 2)).toBe(12);
    });
  });

  describe('Area Conversion', () => {
    it('should convert sq.ft to sq.m correctly', () => {
      const sqFt = 100;
      const sqM = toSqMeters(sqFt, 'sq.ft');
      expect(sqM).toBeCloseTo(9.2903, 4);
    });

    it('should convert sq.m to sq.ft correctly', () => {
      const sqM = 10;
      const sqFt = fromSqMeters(sqM, 'sq.ft', 2);
      expect(sqFt).toBeCloseTo(107.64, 2);
    });
  });

  describe('Volume Conversion', () => {
    it('should convert cu.ft to cu.m correctly', () => {
      const cuFt = 100;
      const cuM = toCuMeters(cuFt, 'cu.ft');
      expect(cuM).toBeCloseTo(2.8317, 4);
    });

    it('should convert cu.m to cu.ft correctly', () => {
      const cuM = 1;
      const cuFt = fromCuMeters(cuM, 'cu.ft', 2);
      expect(cuFt).toBeCloseTo(35.31, 2);
    });
  });

  describe('Rounding and formatting', () => {
    it('should round numbers to specified decimals', () => {
      expect(roundTo(3.14159, 2)).toBe(3.14);
      expect(roundTo(3.14159, 3)).toBe(3.142);
    });

    it('should format brick counts as discrete integer units', () => {
      expect(formatCount(1420.3)).toBe('1,421');
      expect(formatCount(500)).toBe('500');
    });

    it('should handle zero and non-finite inputs gracefully', () => {
      expect(toMeters(NaN, 'm')).toBe(0);
      expect(fromMeters(Infinity, 'ft')).toBe(0);
      expect(formatCount(NaN)).toBe('0');
    });
  });
});
