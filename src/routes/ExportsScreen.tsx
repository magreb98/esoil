import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { downloadProjectBundle } from '../db/projectIO';
import { Banner, Button, Card, PageTitle, SectionTitle } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { buildSiteReport } from '../lib/export/reportData';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportsScreen() {
  const { t } = useTranslation();
  const { projectId, profileId, siteId } = useSelection();
  const project = useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId]);
  const profile = useLiveQuery(() => (profileId ? db.profiles.get(profileId) : undefined), [profileId]);
  const site = useLiveQuery(() => (siteId ? db.sites.get(siteId) : undefined), [siteId]);
  const climateSeries = useLiveQuery(() => (siteId ? db.climateSeries.where('siteId').equals(siteId).first() : undefined), [siteId]);

  const [busy, setBusy] = useState<'excel' | 'word' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = Boolean(project && profile && site && climateSeries);
  const baseFilename = ready ? `${site!.name}-${profile!.soilUnit}`.replace(/[^a-z0-9-_]+/gi, '_') : 'rapport';

  async function withReport(kind: 'excel' | 'word' | 'pdf', run: (report: ReturnType<typeof buildSiteReport>) => Promise<void>) {
    if (!project || !profile || !site || !climateSeries) return;
    setBusy(kind);
    setError(null);
    try {
      const report = buildSiteReport(project.name, site, profile, climateSeries);
      await run(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la génération du rapport");
    } finally {
      setBusy(null);
    }
  }

  async function exportExcel() {
    await withReport('excel', async (report) => {
      const { buildExcelReport } = await import('../lib/export/excelExport');
      downloadBlob(await buildExcelReport(report), `${baseFilename}.xlsx`);
    });
  }

  async function exportWord() {
    await withReport('word', async (report) => {
      const { buildWordReport } = await import('../lib/export/wordExport');
      downloadBlob(await buildWordReport(report), `${baseFilename}.docx`);
    });
  }

  async function exportPdf() {
    await withReport('pdf', async (report) => {
      const { buildPdfReport } = await import('../lib/export/pdfExport');
      downloadBlob(await buildPdfReport(report), `${baseFilename}.pdf`);
    });
  }

  return (
    <div className="max-w-3xl">
      <PageTitle>{t('exports.title')}</PageTitle>

      <Card className="mb-4">
        <SectionTitle>{t('exports.jsonExport')}</SectionTitle>
        <p className="text-sm mb-3" style={{ color: 'var(--color-foreground-muted)' }}>
          Entrées, résultats et version des tables — export complet du projet en un fichier JSON, importable sur un autre appareil hors ligne.
        </p>
        {project ? (
          <Button onClick={() => void downloadProjectBundle(project.id)}>{t('common.export')}</Button>
        ) : (
          <Banner tone="info">Sélectionnez d'abord un projet.</Banner>
        )}
      </Card>

      <Card className="mb-4">
        <SectionTitle>{t('exports.faoTables')}</SectionTitle>
        <p className="text-sm mb-3" style={{ color: 'var(--color-foreground-muted)' }}>
          Un classeur/document par site : un onglet par culture au format FAO (Caractéristique | Valeur | Classe | Degré | Valeur paramétrique), une
          synthèse, les critères non évalués. Généré hors ligne, entièrement côté appareil.
        </p>
        {!ready ? (
          <Banner tone="info">Sélectionnez un projet, un site (avec climat) et un profil pour générer un rapport.</Banner>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportExcel} disabled={busy !== null}>
              {busy === 'excel' ? t('common.loading') : 'Excel (.xlsx)'}
            </Button>
            <Button onClick={exportWord} disabled={busy !== null}>
              {busy === 'word' ? t('common.loading') : 'Word (.docx)'}
            </Button>
            <Button onClick={exportPdf} disabled={busy !== null}>
              {busy === 'pdf' ? t('common.loading') : 'PDF'}
            </Button>
          </div>
        )}
        {error && (
          <div className="mt-3">
            <Banner tone="danger">{error}</Banner>
          </div>
        )}
      </Card>
    </div>
  );
}
