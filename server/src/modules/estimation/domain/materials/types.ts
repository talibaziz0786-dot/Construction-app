import { Unit } from '../units/types';

export enum MaterialCategory {
  CEMENT = 'cement',
  SAND = 'sand',
  AGGREGATE = 'aggregate',
  BRICK = 'brick',
  BLOCK = 'block',
  STEEL = 'steel',
  TILE = 'tile',
  ADHESIVE = 'adhesive',
  GROUT = 'grout',
  PAINT = 'paint',
  PRIMER = 'primer',
  PUTTY = 'putty',
  WATERPROOFING = 'waterproofing',
  PIPE = 'pipe',
  FITTING = 'fitting',
  ELECTRICAL = 'electrical',
  DOOR = 'door',
  WINDOW = 'window',
  HARDWARE = 'hardware',
  OTHER = 'other',
}

export interface MaterialSpecification {
  [key: string]: string | number | boolean;
}

export interface Material {
  id: string;
  category: MaterialCategory;
  name: string;
  description?: string;
  baseUnit: Unit;
  specification: MaterialSpecification;
  status: 'active' | 'deprecated';
}
