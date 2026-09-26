import { Measurement } from '../measurements/Measurement';

export interface Opening {
  id: string;
  type: 'door' | 'window' | 'ventilator' | 'other';
  width: Measurement;
  height: Measurement;
  quantity: number;
}

export interface Wall {
  id: string;
  length: Measurement;
  height: Measurement;
  thickness: Measurement;
  openings: Opening[];
}

export enum SpaceCategory {
  BEDROOM = 'bedroom',
  LIVING = 'living',
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  TOILET = 'toilet',
  DINING = 'dining',
  CORRIDOR = 'corridor',
  BALCONY = 'balcony',
  STORE = 'store',
  UTILITY = 'utility',
  OFFICE = 'office',
  OTHER = 'other',
}

export interface Space {
  id: string;
  name: string;
  category: SpaceCategory;
  length: Measurement;
  width: Measurement;
  height: Measurement;
  walls: Wall[];
}
