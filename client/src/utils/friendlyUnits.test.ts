import { describe, it, expect } from 'vitest';
import { ftInToMeters, formatFtIn, formatSqFt, formatCuFt, formatLengthFriendly } from './friendlyUnits.js';
import { fromCuMeters, fromSqMeters } from './unitConversion.js';

describe('friendlyUnits (presentation only)', () => {
  it('converts 10 ft 6 in to meters at boundary', () => {
    expect(ftInToMeters(10, 6)).toBeCloseTo(3.2004, 4);
  });
  it('formats meters as ft/in', () => {
    expect(formatFtIn(3.2004)).toBe('10 ft 6 in');
    expect(formatFtIn(3.048)).toBe('10 ft');
  });
  it('formats area in sq ft and volume in cu ft with correct labels', () => {
    expect(formatSqFt(42.55)).toContain('sq ft');
    expect(formatCuFt(18.44)).toContain('cu ft');
  });
  it('uses inches for small lengths', () => {
    expect(formatLengthFriendly(0.127)).toBe('5 in');
  });

  it('converts canonical plaster volume to site units (regression for 0.2 cu ft bug)', () => {
    // 100 sq ft x 1 in = 0.235974 cu.m wet; the BOQ panel must convert the
    // value to ~8.33 cu ft, never relabel the cu.m number as cu ft (0.2 cu ft).
    expect(fromSqMeters(9.290304, 'sq.ft')).toBeCloseTo(100, 3);
    expect(fromCuMeters(0.235974, 'cu.ft')).toBeCloseTo(8.333, 2);
    expect(fromCuMeters(0.247773, 'cu.ft')).toBeCloseTo(8.75, 2);
  });
});
