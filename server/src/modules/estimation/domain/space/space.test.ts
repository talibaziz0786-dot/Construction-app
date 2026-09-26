import { describe, it, expect } from 'vitest';
import { Measurement } from '../measurements/Measurement';
import { Unit, Dimension } from '../units/types';
import { Space, SpaceCategory } from './types';

describe('Space Domain', () => {
  it('should create a valid space with walls', () => {
    const length = new Measurement(4, Unit.M, Dimension.LENGTH);
    const width = new Measurement(3, Unit.M, Dimension.LENGTH);
    const height = new Measurement(3, Unit.M, Dimension.LENGTH);
    
    const space: Space = {
      id: 's1',
      name: 'Bedroom 1',
      category: SpaceCategory.BEDROOM,
      length,
      width,
      height,
      walls: []
    };
    
    expect(space.id).toBe('s1');
    expect(space.length.value).toBe(4);
  });
});
