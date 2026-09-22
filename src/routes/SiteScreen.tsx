import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { Banner, Button, Card, Label, PageTitle, SectionTitle, SelectField, TextField } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { newId, nowIso } from '../lib/id';
import { DEFAULT_METHOD_PARAMETERS, type MethodParameters, type MonthlyClimate } from '../lib/domain/types';
import { parseNasaPowerCsv } from '../lib/climate/nasaPowerParser';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function emptyMonths(): MonthlyClimate[] {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, precipitationMm: 0, tMeanC: 0, tMaxC: 0, tMinC: 0 }));
}

export function SiteScreen() {
  const { t } = useTranslation();
  const { projectId, siteId, setSiteId } = useSelection();
  const [newSiteName, setNewSiteName] = useState('');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);

  const project = useLiveQuery(() => (projectId ? db.projects.get(projectId) : undefined), [projectId]);
  const sites = useLiveQuery(() => (projectId ? db.sites.where('projectId').equals(projectId).toArray() : []), [projectId]) ?? [];
  const site = useLiveQuery(() => (siteId ? db.sites.get(siteId) : undefined), [siteId]);
  const climateSeries = useLiveQuery(() => (siteId ? db.climateSeries.where('siteId').equals(siteId).first() : undefined), [siteId]);

  const [months, setMonths] = useState<MonthlyClimate[]>(() => climateSeries?.months ?? emptyMonths());

  useEffect(() => {
    if (climateSeries) setMonths(climateSeries.months);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [climateSeries?.id]);

  if (!projectId || !project) {
    return (
      <div className="max-w-2xl">
        <PageTitle>{t('site.title')}</PageTitle>
        <Banner tone="info">Sélectionnez d'abord un projet dans l'écran « {t('nav.projects')} ».</Banner>
      </div>
    );
  }

  async function createSite() {
    if (!newSiteName.trim() || !projectId) return;
    const id = newId();
    await db.sites.add({
      id,
      projectId,
      name: newSiteName.trim(),
      latitude: 0,
      longitude: 0,
      methodParameters: DEFAULT_METHOD_PARAMETERS,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    setNewSiteName('');
    setSiteId(id);
  }

  async function updateSite(patch: Partial<typeof site>) {
    if (!siteId) return;
    await db.sites.update(siteId, { ...patch, updatedAt: nowIso() } as never);
  }

  function useGps() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Géolocalisation non disponible sur cet appareil");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void updateSite({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, altitudeM: pos.coords.altitude ?? undefined });
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function saveClimateManual() {
    if (!siteId) return;
    const id = climateSeries?.id ?? newId();
    await db.climateSeries.put({ id, siteId, source: 'manuel', months, createdAt: nowIso() });
  }

  async function handleCsvUpload(file: File) {
    const text = await file.text();
    const result = parseNasaPowerCsv(text);
    setCsvWarnings(result.warnings);
    if (result.months.length === 12 && siteId) {
      setMonths(result.months);
      const id = climateSeries?.id ?? newId();
      await db.climateSeries.put({ id, siteId, source: 'nasa_power', months: result.months, createdAt: nowIso() });
    }
  }

  function updateMonth(index: number, patch: Partial<MonthlyClimate>) {
    setMonths((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  const methodParams: MethodParameters = site?.methodParameters ?? DEFAULT_METHOD_PARAMETERS;

  return (
    <div className="max-w-4xl">
      <PageTitle>
        {t('site.title')} — {project.name}
      </PageTitle>

      <Card className="mb-4">
        <SectionTitle>{t('site.title')}</SectionTitle>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <SelectField value={siteId ?? ''} onChange={(e) => setSiteId(e.target.value || null)}>
            <option value="">— Choisir un site —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <TextField placeholder={t('site.name')} value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} />
          <Button onClick={createSite} disabled={!newSiteName.trim()}>
            {t('common.add')}
          </Button>
        </div>
      </Card>

      {site && (
        <>
          <Card className="mb-4">
            <SectionTitle>{t('site.location')}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <Label>{t('site.latitude')}</Label>
                <TextField
                  type="number"
                  step="any"
                  value={site.latitude}
                  onChange={(e) => void updateSite({ latitude: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t('site.longitude')}</Label>
                <TextField
                  type="number"
                  step="any"
                  value={site.longitude}
                  onChange={(e) => void updateSite({ longitude: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t('site.altitude')}</Label>
                <TextField
                  type="number"
                  step="any"
                  value={site.altitudeM ?? ''}
                  onChange={(e) => void updateSite({ altitudeM: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            </div>
            <Button variant="secondary" onClick={useGps}>
              {t('site.useGps')}
            </Button>
            {gpsError && (
              <div className="mt-2">
                <Banner tone="warning">{gpsError}</Banner>
              </div>
            )}
          </Card>

          <Card className="mb-4">
            <SectionTitle>{t('site.methodParameters')}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>{t('site.etpSource')}</Label>
                <SelectField
                  value={methodParams.etpSource}
                  onChange={(e) => void updateSite({ methodParameters: { ...methodParams, etpSource: e.target.value as MethodParameters['etpSource'] } })}
                >
                  <option value="thornthwaite">Thornthwaite (calculée)</option>
                  <option value="saisie_manuelle">Saisie manuelle par mois</option>
                </SelectField>
              </div>
              <div>
                <Label>{t('site.waterHoldingCapacity')}</Label>
                <TextField
                  type="number"
                  value={methodParams.waterHoldingCapacityMm}
                  onChange={(e) =>
                    void updateSite({ methodParameters: { ...methodParams, waterHoldingCapacityMm: parseFloat(e.target.value) || 0 } })
                  }
                />
              </div>
              <div>
                <Label>{t('site.slopeScale')}</Label>
                <SelectField
                  value={methodParams.defaultSlopeScale}
                  onChange={(e) =>
                    void updateSite({ methodParameters: { ...methodParams, defaultSlopeScale: Number(e.target.value) as 1 | 2 | 3 } })
                  }
                >
                  <option value={1}>Échelle 1</option>
                  <option value={2}>Échelle 2</option>
                  <option value={3}>Échelle 3</option>
                </SelectField>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>{t('site.climate')}</SectionTitle>
            <div className="mb-3">
              <label className="inline-flex">
                <Button variant="secondary" onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement)?.click()}>
                  {t('site.importNasaPower')}
                </Button>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCsvUpload(file);
                  }}
                />
              </label>
            </div>
            {csvWarnings.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {csvWarnings.map((w, i) => (
                  <Banner key={i} tone="warning">
                    {w}
                  </Banner>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse tabular-nums">
                <thead>
                  <tr>
                    <th className="sticky left-0 text-left p-2" style={{ backgroundColor: 'var(--color-surface)' }}>
                      Mois
                    </th>
                    {MONTH_LABELS.map((m) => (
                      <th key={m} className="p-2 text-center">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['precipitationMm', 'P (mm)'],
                      ['tMeanC', 'T moy (°C)'],
                      ['tMaxC', 'T max (°C)'],
                      ['tMinC', 'T min (°C)'],
                      ['sunshineHoursN', 'n (h)'],
                    ] as const
                  ).map(([field, label]) => (
                    <tr key={field} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="sticky left-0 p-2 font-medium" style={{ backgroundColor: 'var(--color-surface)' }}>
                        {label}
                      </td>
                      {months.map((m, i) => (
                        <td key={i} className="p-1">
                          <input
                            type="number"
                            step="any"
                            className="w-16 rounded border px-1 py-1 text-center tabular-nums"
                            style={{ borderColor: 'var(--color-border-strong)', backgroundColor: 'var(--color-surface)', color: 'var(--color-foreground)' }}
                            value={(m[field] ?? '') as number | string}
                            onChange={(e) => updateMonth(i, { [field]: e.target.value ? parseFloat(e.target.value) : undefined })}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Button onClick={saveClimateManual}>{t('common.save')}</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
