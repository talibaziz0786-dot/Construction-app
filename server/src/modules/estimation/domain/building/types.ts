import { Floor } from '../floor/types';

export interface Building {
  id: string;
  name: string;
  floors: Floor[];
}
