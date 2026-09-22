import Dexie, { type EntityTable } from 'dexie';
import type { ClimateSeries, CropEvaluation, Profile, Project, Site } from '../lib/domain/types';

/** Historique horodaté d'une évaluation, avec la version des tables utilisées (§2, confirmé). */
export interface EvaluationHistoryEntry extends CropEvaluation {
  id: string;
  tablesVersion: string;
}

export class EsoilDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  sites!: EntityTable<Site, 'id'>;
  profiles!: EntityTable<Profile, 'id'>;
  climateSeries!: EntityTable<ClimateSeries, 'id'>;
  evaluations!: EntityTable<EvaluationHistoryEntry, 'id'>;

  constructor() {
    super('esoil');
    this.version(1).stores({
      projects: 'id, name, createdAt',
      sites: 'id, projectId, name',
      profiles: 'id, siteId, soilUnit',
      climateSeries: 'id, siteId',
      evaluations: 'id, profileId, cropCode, computedAt',
    });
  }
}

export const db = new EsoilDatabase();
