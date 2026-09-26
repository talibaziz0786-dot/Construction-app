export type MeasurementSystem = 'metric' | 'imperial';

export type LengthUnit = 'm' | 'cm' | 'mm' | 'ft' | 'in';

export type AreaUnit = 'sq.m' | 'sq.ft' | 'sq.in';

export type VolumeUnit = 'cu.m' | 'cu.ft';

export interface UnitDisplayMeta {
  symbol: string;
  labelEn: string;
  labelHi: string;
}

export const LENGTH_UNITS: Record<LengthUnit, UnitDisplayMeta> = {
  m: { symbol: 'm', labelEn: 'Meters', labelHi: 'मीटर' },
  cm: { symbol: 'cm', labelEn: 'Centimeters', labelHi: 'सेंटीमीटर' },
  mm: { symbol: 'mm', labelEn: 'Millimeters', labelHi: 'मिलीमीटर' },
  ft: { symbol: 'ft', labelEn: 'Feet', labelHi: 'फीट' },
  in: { symbol: 'in', labelEn: 'Inches', labelHi: 'इंच' },
};

export const AREA_UNITS: Record<AreaUnit, UnitDisplayMeta> = {
  'sq.m': { symbol: 'sq.m', labelEn: 'Square Meters', labelHi: 'वर्ग मीटर' },
  'sq.ft': { symbol: 'sq ft', labelEn: 'Square Feet', labelHi: 'वर्ग फीट' },
  'sq.in': { symbol: 'sq in', labelEn: 'Square Inches', labelHi: 'वर्ग इंच' },
};

export const VOLUME_UNITS: Record<VolumeUnit, UnitDisplayMeta> = {
  'cu.m': { symbol: 'cu.m', labelEn: 'Cubic Meters', labelHi: 'घन मीटर' },
  'cu.ft': { symbol: 'cu ft', labelEn: 'Cubic Feet', labelHi: 'घन फीट' },
};
