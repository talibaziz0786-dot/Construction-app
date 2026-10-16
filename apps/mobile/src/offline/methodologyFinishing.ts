/**
 * Offline methodology (part 2: concrete + plaster + tile).
 * Canonical sources (frozen): ConcreteVolumeCalculator, PlasterQuantityCalculator
 * (verified spec 1:4, dry factor 1.33, cement 1440 kg/cu.m, 50 kg bag),
 * TileQuantityCalculator. Parity enforced by scripts/offline-parity.js.
 */
import { OfflineInputError } from './methodology';

/** Mirrors ConcreteVolumeCalculator: net L*W*D + wastage allowance. */
export function concreteVolume(length: number, width: number, depth: number, wastagePercentage: number) {
  const netVolume = length * width * depth;
  const allowance = netVolume * (wastagePercentage / 100);
  return { netVolume, allowance, procurementVolume: netVolume + allowance, wastagePercentage };
}

/** Mirrors PlasterQuantityCalculator verified plaster specification. */
export function plasterQuantity(args: {
  netSurfaceArea: number;
  plasterThickness: number;
  wastagePercentage: number;
  cementRatio?: number;
  sandRatio?: number;
  dryVolumeFactor?: number;
  cementBagWeightKg?: number;
}) {
  const cementRatio = args.cementRatio ?? 1;
  const sandRatio = args.sandRatio ?? 4;
  const dryVolumeFactor = args.dryVolumeFactor ?? 1.33;
  const cementBagWeightKg = args.cementBagWeightKg ?? 50;
  if (!(cementRatio > 0) || !(sandRatio > 0) || !(dryVolumeFactor > 0) || !(cementBagWeightKg > 0)) {
    throw new OfflineInputError('Invalid plaster mix specification');
  }
  const theoreticalVolume = args.netSurfaceArea * args.plasterThickness;
  const allowance = theoreticalVolume * (args.wastagePercentage / 100);
  const procurementVolume = theoreticalVolume + allowance;
  const dryMaterialVolume = procurementVolume * dryVolumeFactor;
  const totalParts = cementRatio + sandRatio;
  const cementVolume = dryMaterialVolume * (cementRatio / totalParts);
  const sandVolume = dryMaterialVolume * (sandRatio / totalParts);
  const cementQuantityKg = cementVolume * 1440;
  const cementBags = cementQuantityKg / cementBagWeightKg;
  return {
    theoreticalVolume,
    allowance,
    procurementVolume,
    dryMaterialVolume,
    cementQuantityKg,
    cementBags,
    sandVolume,
    mixRatio: `${cementRatio}:${sandRatio}`,
    dryVolumeFactor,
    cementBagWeightKg,
    wastagePercentage: args.wastagePercentage,
  };
}

/** Mirrors TileQuantityCalculator: floor L*W / single-tile area, procurement UP. */
export function tileQuantity(args: {
  roomLength: number;
  roomWidth: number;
  tileLength: number;
  tileWidth: number;
  wastagePercentage: number;
}) {
  const floorArea = args.roomLength * args.roomWidth;
  const singleTileArea = args.tileLength * args.tileWidth;
  if (!(singleTileArea > 0)) throw new OfflineInputError('Single tile area must be greater than zero');
  const theoretical = floorArea / singleTileArea;
  const allowance = theoretical * (args.wastagePercentage / 100);
  return {
    floorArea,
    singleTileArea,
    theoretical,
    allowance,
    procurement: Math.ceil(theoretical + allowance),
    wastagePercentage: args.wastagePercentage,
  };
}
