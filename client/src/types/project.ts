export type MaterialCategory = 
  | 'aggregate'
  | 'adhesive'
  | 'brick'
  | 'block'
  | 'steel'
  | 'tile'
  | 'grout'
  | 'paint'
  | 'primer'
  | 'putty'
  | 'waterproofing'
  | 'pipe'
  | 'fitting'
  | 'electrical'
  | 'door'
  | 'window'
  | 'hardware'
  | 'other'
  | 'cement'
  | 'concrete'
  | 'sand'
  | 'plaster';
export type ProjectType = 'room' | 'house';

export interface OpeningItem {
  id: string;
  type: 'door' | 'window';
  widthMeters: number;
  heightMeters: number;
  quantity: number;
  wallSide?: 'north' | 'south' | 'east' | 'west';
}

export interface RoomGeometry {
  lengthMeters: number;
  widthMeters: number;
  wallHeightMeters: number;
  wallThicknessMeters: number;
  openings: OpeningItem[];
  brickLengthMeters: number;
  brickWidthMeters: number;
  brickHeightMeters: number;
  mortarJointThicknessMeters: number;
  wastagePercentage: number;
}

export interface IOpeningSchema {
  id: string;
  type: 'door' | 'window';
  widthMeters: number;
  heightMeters: number;
  quantity: number;
}

export interface IRoomSchema {
  id: string;
  name: string;
  category: string;
  lengthMeters: number;
  widthMeters: number;
  wallHeightMeters: number;
  wallThicknessMeters: number;
  openings: IOpeningSchema[];
  brickLengthMeters: number;
  brickWidthMeters: number;
  brickHeightMeters: number;
  mortarJointThicknessMeters: number;
  wastagePercentage: number;
}

export interface IFloorSchema {
  id: string;
  name: string;
  level: number;
  rooms: IRoomSchema[];
}

export interface IBuildingSchema {
  id: string;
  name: string;
  floors: IFloorSchema[];
}

export interface IRateCardEntrySchema {
  category: MaterialCategory;
  /** Specific item / material label (brand, grade, supplier item name) */
  item?: string;
  rate: number | null;
  unit: string;
  currency: string;
  source?: string;
  location?: string;
  /** Free-form notes about the rate */
  notes?: string;
  /** When the rate was last updated (also acts as the rate version) */
  updatedAt?: string;
}

export interface IRateCardSchema {
  projectId?: string;
  entries: IRateCardEntrySchema[];
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  createdAt: string;
  geometry?: RoomGeometry;
  buildings?: IBuildingSchema[];
  rateCard?: IRateCardSchema;
}
