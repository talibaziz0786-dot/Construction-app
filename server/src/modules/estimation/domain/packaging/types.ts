import { Unit } from '../units/types';

export interface Packaging {
  id: string;
  materialId: string;
  name: string;
  quantity: number;
  unit: Unit;
  coverage?: number; // Optional coverage in square meters or other units
}
