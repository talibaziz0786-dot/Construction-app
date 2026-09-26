import mongoose, { Schema, Document } from 'mongoose';

export interface IOpeningSchema {
  id: string;
  type: 'door' | 'window' | 'ventilator' | 'other';
  widthMeters: number;
  heightMeters: number;
  quantity: number;
  wallSide?: 'north' | 'south' | 'east' | 'west';
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
  slabDepthMeters?: number;
  plasterThicknessMeters?: number;
  tileLengthMeters?: number;
  tileWidthMeters?: number;
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
  category: string;
  /** Specific item / material label (brand, grade, supplier item name). */
  item?: string;
  rate: number | null;
  unit: string;
  currency: string;
  source?: string;
  location?: string;
  /** Free-form notes about this rate. */
  notes?: string;
  updatedAt?: string;
}

export interface IRateCardSchema {
  entries: IRateCardEntrySchema[];
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectDocument extends Document {
  projectId: string;
  name: string;
  type: string;
  createdAt: string;
  buildings: IBuildingSchema[];
  rateCard?: IRateCardSchema;
  userId?: string;
}

const OpeningSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['door', 'window', 'ventilator', 'other'], required: true },
  widthMeters: { type: Number, required: true, min: 0.05 },
  heightMeters: { type: Number, required: true, min: 0.05 },
  quantity: { type: Number, required: true, min: 1 },
  wallSide: { type: String, enum: ['north', 'south', 'east', 'west'], default: 'north' },
}, { _id: false });

const RoomSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, default: 'room' },
  lengthMeters: { type: Number, required: true, min: 0.1, max: 100 },
  widthMeters: { type: Number, required: true, min: 0.1, max: 100 },
  wallHeightMeters: { type: Number, required: true, min: 0.5, max: 20 },
  wallThicknessMeters: { type: Number, required: true, min: 0.05, max: 2 },
  openings: [OpeningSchema],
  brickLengthMeters: { type: Number, default: 0.19 },
  brickWidthMeters: { type: Number, default: 0.09 },
  brickHeightMeters: { type: Number, default: 0.09 },
  mortarJointThicknessMeters: { type: Number, default: 0.01 },
  wastagePercentage: { type: Number, default: 5, min: 0, max: 50 },
  slabDepthMeters: { type: Number, default: 0.15 },
  plasterThicknessMeters: { type: Number, default: 0.012 },
  tileLengthMeters: { type: Number, default: 0.5 },
  tileWidthMeters: { type: Number, default: 0.5 },
}, { _id: false });

const FloorSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  level: { type: Number, default: 0 },
  rooms: [RoomSchema],
}, { _id: false });

const BuildingSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  floors: [FloorSchema],
}, { _id: false });

const RateCardEntrySchema = new Schema({
  category: { type: String, required: true },
  item: { type: String, default: '' },
  rate: { type: Number, default: null, min: 0 },
  unit: { type: String, required: true },
  currency: { type: String, required: true, default: 'USD' },
  source: { type: String, default: '' },
  location: { type: String, default: '' },
  notes: { type: String, default: '' },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

const RateCardSchema = new Schema({
  entries: [RateCardEntrySchema],
  currency: { type: String, default: 'USD' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

const ProjectSchema = new Schema({
  projectId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  type: { type: String, enum: ['room', 'house'], default: 'house' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  buildings: [BuildingSchema],
  rateCard: { type: RateCardSchema, default: null },
  userId: { type: String, index: true },
}, { timestamps: true });

export const ProjectModel = mongoose.models.Project || mongoose.model<IProjectDocument>('Project', ProjectSchema);