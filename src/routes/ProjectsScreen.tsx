import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/schema';
import { downloadProjectBundle, importProjectBundleFromFile } from '../db/projectIO';
import { Banner, Button, Card, PageTitle, TextField } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { newId, nowIso } from '../lib/id';

export function ProjectsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setProjectId } = useSelection();
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray(), []) ?? [];
  const sites = useLiveQuery(() => db.sites.toArray(), []) ?? [];

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  async function createProject() {
    if (!newName.trim()) return;
    const id = newId();
    await db.projects.add({ id, name: newName.trim(), createdAt: nowIso(), updatedAt: nowIso() });
    setNewName('');
    setProjectId(id);
    navigate('/site');
  }

  async function handleImport(file: File) {
    try {
      setError(null);
      const id = await importProjectBundleFromFile(file);
      setProjectId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import invalide');
    }
  }

  return (
    <div className="max-w-3xl">
      <PageTitle>{t('projects.title')}</PageTitle>

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <TextField placeholder={t('projects.newProject')} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={createProject} disabled={!newName.trim()}>
            {t('common.add')}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <TextField placeholder={t('projects.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="inline-flex">
          <Button variant="secondary" onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement)?.click()}>
            {t('projects.importProject')}
          </Button>
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
        </label>
      </div>

      {error && (
        <div className="mb-4">
          <Banner tone="danger">{error}</Banner>
        </div>
      )}

      {filtered.length === 0 && (
        <Card>
          <p style={{ color: 'var(--color-foreground-muted)' }}>{t('projects.empty')}</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((p) => {
          const siteCount = sites.filter((s) => s.projectId === p.id).length;
          return (
            <Card key={p.id} className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="text-left flex-1 cursor-pointer"
                onClick={() => {
                  setProjectId(p.id);
                  navigate('/site');
                }}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
                  {siteCount} {t('projects.sites')}
                </div>
              </button>
              <Button variant="secondary" onClick={() => void downloadProjectBundle(p.id)}>
                {t('projects.exportProject')}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
