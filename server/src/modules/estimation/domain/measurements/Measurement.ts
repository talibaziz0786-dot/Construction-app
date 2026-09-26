import { Unit, Dimension } from '../units/types';
import { CONVERSION_FACTORS } from '../units/conversion';

export class Measurement {
  constructor(
    public readonly value: number,
    public readonly unit: Unit,
    public readonly dimension: Dimension
  ) {
    if (isNaN(value) || !isFinite(value)) {
      throw new Error('Measurement value must be a valid number');
    }
    if (value < 0) {
      throw new Error('Measurement value cannot be negative');
    }
  }

  toBase(): number {
    return this.value * CONVERSION_FACTORS[this.unit].base;
  }

  static fromBase(value: number, unit: Unit): Measurement {
    const data = CONVERSION_FACTORS[unit];
    return new Measurement(value / data.base, unit, data.dimension);
  }
}
