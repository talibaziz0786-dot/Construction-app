import { Measurement } from '../measurements/Measurement.js';
import { Dimension, Unit } from '../units/types.js';
import { IOpeningSchema, IRoomSchema } from '../../../project/models/ProjectModel.js'; // Assuming IRoomSchema is the source

export interface DerivedWall {
  id: string;
  name: 'North Wall' | 'South Wall' | 'East Wall' | 'West Wall';
  length: Measurement;
  height: Measurement;
  thickness: Measurement;
  openings: IOpeningSchema[];
}

/**
 * Derives the four canonical walls of a room with strict opening-to-wall ownership.
 * Openings are assigned strictly to their designated owning wall ('north' | 'south' | 'east' | 'west').
 * Legacy openings without an explicit wallSide deterministically default to 'north'
 * to avoid uniform duplication across unrelated walls.
 */
export function deriveWallsFromRoom(room: IRoomSchema): DerivedWall[] {
  const { id: roomId, lengthMeters, widthMeters, wallHeightMeters, wallThicknessMeters, openings = [] } = room;

  const northOpenings = openings.filter((o) => (o.wallSide || 'north') === 'north');
  const southOpenings = openings.filter((o) => o.wallSide === 'south');
  const eastOpenings = openings.filter((o) => o.wallSide === 'east');
  const westOpenings = openings.filter((o) => o.wallSide === 'west');

  const walls: DerivedWall[] = [
    {
      id: `${roomId}-north`,
      name: 'North Wall',
      length: new Measurement(lengthMeters, Unit.M, Dimension.LENGTH),
      height: new Measurement(wallHeightMeters, Unit.M, Dimension.LENGTH),
      thickness: new Measurement(wallThicknessMeters, Unit.M, Dimension.LENGTH),
      openings: northOpenings,
    },
    {
      id: `${roomId}-south`,
      name: 'South Wall',
      length: new Measurement(lengthMeters, Unit.M, Dimension.LENGTH),
      height: new Measurement(wallHeightMeters, Unit.M, Dimension.LENGTH),
      thickness: new Measurement(wallThicknessMeters, Unit.M, Dimension.LENGTH),
      openings: southOpenings,
    },
    {
      id: `${roomId}-east`,
      name: 'East Wall',
      length: new Measurement(widthMeters, Unit.M, Dimension.LENGTH),
      height: new Measurement(wallHeightMeters, Unit.M, Dimension.LENGTH),
      thickness: new Measurement(wallThicknessMeters, Unit.M, Dimension.LENGTH),
      openings: eastOpenings,
    },
    {
      id: `${roomId}-west`,
      name: 'West Wall',
      length: new Measurement(widthMeters, Unit.M, Dimension.LENGTH),
      height: new Measurement(wallHeightMeters, Unit.M, Dimension.LENGTH),
      thickness: new Measurement(wallThicknessMeters, Unit.M, Dimension.LENGTH),
      openings: westOpenings,
    },
  ];

  return walls;
}
