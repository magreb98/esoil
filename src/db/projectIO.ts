/** Export / import d'un projet complet en fichier JSON, pour le partager sans serveur (§2). */
import { db, type EvaluationHistoryEntry } from './schema';
import type { ClimateSeries, Profile, Project, Site } from '../lib/domain/types';

export interface ProjectBundle {
  formatVersion: 1;
  exportedAt: string;
  project: Project;
  sites: Site[];
  profiles: Profile[];
  climateSeries: ClimateSeries[];
  evaluations: EvaluationHistoryEntry[];
}

export async function exportProjectBundle(projectId: string): Promise<ProjectBundle> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error(`Projet ${projectId} introuvable`);

  const sites = await db.sites.where('projectId').equals(projectId).toArray();
  const siteIds = new Set(sites.map((s) => s.id));

  const profiles = (await db.profiles.toArray()).filter((p) => siteIds.has(p.siteId));
  const climateSeries = (await db.climateSeries.toArray()).filter((c) => siteIds.has(c.siteId));
  const profileIds = new Set(profiles.map((p) => p.id));
  const evaluations = (await db.evaluations.toArray()).filter((e) => profileIds.has(e.profileId));

  return { formatVersion: 1, exportedAt: new Date().toISOString(), project, sites, profiles, climateSeries, evaluations };
}

export async function downloadProjectBundle(projectId: string): Promise<void> {
  const bundle = await exportProjectBundle(projectId);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bundle.project.name.replace(/[^a-z0-9-_]+/gi, '_')}.esoil.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectBundle(bundle: ProjectBundle): Promise<string> {
  if (bundle.formatVersion !== 1) throw new Error('Format de fichier projet non reconnu');
  await db.transaction('rw', db.projects, db.sites, db.profiles, db.climateSeries, db.evaluations, async () => {
    await db.projects.put(bundle.project);
    await db.sites.bulkPut(bundle.sites);
    await db.profiles.bulkPut(bundle.profiles);
    await db.climateSeries.bulkPut(bundle.climateSeries);
    await db.evaluations.bulkPut(bundle.evaluations);
  });
  return bundle.project.id;
}

export async function importProjectBundleFromFile(file: File): Promise<string> {
  const text = await file.text();
  const bundle = JSON.parse(text) as ProjectBundle;
  return importProjectBundle(bundle);
}
