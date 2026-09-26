import { Unit } from './types';

/**
 * Canonical unit labels normalisation.
 *
 * Rate cards and imported data store unit labels exactly as a user typed them
 * ("nos", "cu.m", "bags", …). Cost calculation needs canonical `Unit` values, so
 * the accepted aliases live here — the single place that decides whether a
 * user-entered unit can be understood by the engine.
 */
const UNIT_LABEL_ALIASES: Record<string, Unit> = {
  // Count
  nos: Unit.PIECE,
  no: Unit.PIECE,
  number: Unit.PIECE,
  numbers: Unit.PIECE,
  piece: Unit.PIECE,
  pieces: Unit.PIECE,
  pcs: Unit.PIECE,
  pc: Unit.PIECE,
  bag: Unit.PIECE,
  bags: Unit.PIECE,
  // Length
  mm: Unit.MM,
  cm: Unit.CM,
  m: Unit.M,
  mtr: Unit.M,
  meter: Unit.M,
  metre: Unit.M,
  inch: Unit.INCH,
  in: Unit.INCH,
  ft: Unit.FT,
  feet: Unit.FT,
  'running.m': Unit.M,
  'running ft': Unit.FT,
  'running.ft': Unit.FT,
  // Area
  'sq.m': Unit.SQ_M,
  sqm: Unit.SQ_M,
  m2: Unit.SQ_M,
  'sq.ft': Unit.SQ_FT,
  sqft: Unit.SQ_FT,
  ft2: Unit.SQ_FT,
  // Volume
  'cu.m': Unit.CU_M,
  cum: Unit.CU_M,
  m3: Unit.CU_M,
  'cu.ft': Unit.CU_FT,
  cft: Unit.CU_FT,
  ft3: Unit.CU_FT,
  // Mass
  g: Unit.GRAM,
  gram: Unit.GRAM,
  kg: Unit.KG,
  kgs: Unit.KG,
  tonne: Unit.TONNE,
  ton: Unit.TONNE,
};

/**
 * Resolves a user-entered unit label to a canonical unit.
 * Returns `null` when the label cannot be understood — callers must then treat
 * the rate as unusable instead of guessing a conversion.
 */
export function normalizeUnitLabel(label: string): Unit | null {
  return UNIT_LABEL_ALIASES[label.trim().toLowerCase()] ?? null;
}
