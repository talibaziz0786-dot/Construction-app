import { Unit } from '../units/types';

export class Quantity {
  constructor(
    public readonly value: number,
    public readonly unit: Unit
  ) {
    if (isNaN(value) || !isFinite(value)) {
      throw new Error('Quantity value must be a valid number');
    }
  }
}
