import { Calculator } from '../engine/contracts/Calculator.js';
import { EstimationOrchestrator } from '../engine/orchestration/EstimationOrchestrator.js';
import { ConcreteVolumeCalculator } from './ConcreteVolumeCalculator.js';
import { MasonryBrickQuantityCalculator } from './MasonryBrickQuantityCalculator.js';
import { PlasterQuantityCalculator } from './PlasterQuantityCalculator.js';
import { RoomFloorAreaCalculator } from './RoomFloorAreaCalculator.js';
import { TileQuantityCalculator } from './TileQuantityCalculator.js';
import { WallNetAreaCalculator } from './WallNetAreaCalculator.js';

/**
 * The verified calculators of the platform.
 *
 * Only calculators with a documented, verified methodology may be listed here.
 * Anything else stays "Coming Soon" until an engineering specification exists —
 * never add a calculator here to make a feature work.
 */
export function createCanonicalCalculators(): Calculator<unknown, unknown>[] {
  return [
    new RoomFloorAreaCalculator(),
    new WallNetAreaCalculator(),
    new MasonryBrickQuantityCalculator(),
    new ConcreteVolumeCalculator(),
    new PlasterQuantityCalculator(),
    new TileQuantityCalculator(),
  ];
}

/**
 * Documented production dependencies between calculators.
 *
 * These mirror the documented assumptions of the estimation methodology:
 * masonry volume is derived from the net wall area, plaster is applied to the net
 * wall surface, and tile coverage is derived from the room floor area.
 */
const CALCULATOR_DEPENDENCIES: ReadonlyArray<{ calculatorId: string; dependsOn: string }> = [
  { calculatorId: 'masonry.brick-quantity', dependsOn: 'wall.net-area' },
  { calculatorId: 'plaster.quantity', dependsOn: 'wall.net-area' },
  { calculatorId: 'tile.quantity', dependsOn: 'room.floor-area' },
];

/**
 * Registers every verified calculator and its declared dependencies.
 * Idempotent: calling it more than once never creates duplicate registrations.
 */
export function registerCanonicalCalculators(orchestrator: EstimationOrchestrator): void {
  for (const calculator of createCanonicalCalculators()) {
    if (!orchestrator.hasCalculator(calculator.identity.calculatorId)) {
      orchestrator.registerCalculator(calculator);
    }
  }

  for (const dependency of CALCULATOR_DEPENDENCIES) {
    if (!orchestrator.hasCalculator(dependency.calculatorId) || !orchestrator.hasCalculator(dependency.dependsOn)) {
      continue;
    }
    if (!orchestrator.getDependencies(dependency.calculatorId).includes(dependency.dependsOn)) {
      orchestrator.declareDependency(dependency.calculatorId, dependency.dependsOn);
    }
  }
}
