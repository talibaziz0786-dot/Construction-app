import { Space } from '../space/types';

export interface Floor {
  id: string;
  name: string;
  level: number;
  spaces: Space[];
}
