import { Unit, Dimension } from './types';

export const CONVERSION_FACTORS: Record<Unit, { base: number; dimension: Dimension }> = {
  // Length (Base: Meter)
  [Unit.MM]: { base: 0.001, dimension: Dimension.LENGTH },
  [Unit.CM]: { base: 0.01, dimension: Dimension.LENGTH },
  [Unit.M]: { base: 1, dimension: Dimension.LENGTH },
  [Unit.INCH]: { base: 0.0254, dimension: Dimension.LENGTH },
  [Unit.FT]: { base: 0.3048, dimension: Dimension.LENGTH },
  // Area (Base: Square Meter)
  [Unit.SQ_MM]: { base: 0.000001, dimension: Dimension.AREA },
  [Unit.SQ_CM]: { base: 0.0001, dimension: Dimension.AREA },
  [Unit.SQ_M]: { base: 1, dimension: Dimension.AREA },
  [Unit.SQ_IN]: { base: 0.00064516, dimension: Dimension.AREA },
  [Unit.SQ_FT]: { base: 0.092903, dimension: Dimension.AREA },
  // Volume (Base: Cubic Meter)
  [Unit.CU_MM]: { base: 1e-9, dimension: Dimension.VOLUME },
  [Unit.CU_CM]: { base: 1e-6, dimension: Dimension.VOLUME },
  [Unit.CU_M]: { base: 1, dimension: Dimension.VOLUME },
  [Unit.CU_IN]: { base: 1.63871e-5, dimension: Dimension.VOLUME },
  [Unit.CU_FT]: { base: 0.0283168, dimension: Dimension.VOLUME },
  // Mass (Base: Kilogram)
  [Unit.GRAM]: { base: 0.001, dimension: Dimension.MASS },
  [Unit.KG]: { base: 1, dimension: Dimension.MASS },
  [Unit.TONNE]: { base: 1000, dimension: Dimension.MASS },
  // Count
  [Unit.PIECE]: { base: 1, dimension: Dimension.COUNT },
};

export const convert = (value: number, from: Unit, to: Unit): number => {
  const fromData = CONVERSION_FACTORS[from];
  const toData = CONVERSION_FACTORS[to];

  if (fromData.dimension !== toData.dimension) {
    throw new Error(`Dimension mismatch: cannot convert ${from} (${fromData.dimension}) to ${to} (${toData.dimension})`);
  }

  const baseValue = value * fromData.base;
  return baseValue / toData.base;
};
