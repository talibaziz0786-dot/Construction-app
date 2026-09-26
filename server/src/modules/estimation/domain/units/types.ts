export enum Dimension {
  LENGTH = 'LENGTH',
  AREA = 'AREA',
  VOLUME = 'VOLUME',
  MASS = 'MASS',
  COUNT = 'COUNT',
}

export enum Unit {
  // Length
  MM = 'mm',
  CM = 'cm',
  M = 'm',
  INCH = 'inch',
  FT = 'ft',
  // Area
  SQ_MM = 'sq.mm',
  SQ_CM = 'sq.cm',
  SQ_M = 'sq.m',
  SQ_IN = 'sq.in',
  SQ_FT = 'sq.ft',
  // Volume
  CU_MM = 'cu.mm',
  CU_CM = 'cu.cm',
  CU_M = 'cu.m',
  CU_IN = 'cu.in',
  CU_FT = 'cu.ft',
  // Mass
  GRAM = 'gram',
  KG = 'kg',
  TONNE = 'tonne',
  // Count
  PIECE = 'piece',
}

export const BASE_UNITS: Record<Dimension, Unit> = {
  [Dimension.LENGTH]: Unit.M,
  [Dimension.AREA]: Unit.SQ_M,
  [Dimension.VOLUME]: Unit.CU_M,
  [Dimension.MASS]: Unit.KG,
  [Dimension.COUNT]: Unit.PIECE,
};
