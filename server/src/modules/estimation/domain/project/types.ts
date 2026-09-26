import { Building } from '../building/types';

export interface Project {
  id: string;
  name: string;
  description?: string;
  location: string;
  currency: string;
  buildings: Building[];
}
