import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { Banner, Card, PageTitle, ScrollTable, TextField } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { CROPS, isCropEvaluable } from '../config/crops';
import { evaluateCrop } from '../lib/evaluation/evaluateCrop';
import { ClassBadge, classDegree } from '../components/ui/ClassBadge';

interface MatrixRow {
  siteId: string;
  siteName: string;
  profileId: string;
  soilUnit: string;
  cropCode: string;
  cropName: string;
  classe: string;
  landIndex: number;
}

export function MatrixScreen() {
  const { t } = useTranslation();
  const { projectId } = useSelection();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'site' | 'profile' | 'crop' | 'classe'>('site');

  const sites = useLiveQuery(() => (projectId ? db.sites.where('projectId').equals(projectId).toArray() : []), [projectId]) ?? [];
  const allProfiles = useLiveQuery(() => db.profiles.toArray(), []) ?? [];
  const allClimate = useLiveQuery(() => db.climateSeries.toArray(), []) ?? [];

  const rows = useMemo<MatrixRow[]>(() => {
    const out: MatrixRow[] = [];
    for (const site of sites) {
      const profiles = allProfiles.filter((p) => p.siteId === site.id);
      const climate = allClimate.find((c) => c.siteId === site.id);
      if (!climate) continue;
      for (const profile of profiles) {
        for (const crop of CROPS.filter(isCropEvaluable)) {
          const evaluation = evaluateCrop(profile, climate, crop, site);
          out.push({
            siteId: site.id,
            siteName: site.name,
            profileId: profile.id,
            soilUnit: profile.soilUnit,
            cropCode: crop.code,
            cropName: crop.name,
            classe: evaluation.finalNotation,
            landIndex: evaluation.parametric.indiceTerre,
          });
        }
      }
    }
    return out;
  }, [sites, allProfiles, allClimate]);

  const filtered = rows
    .filter((r) => `${r.siteName} ${r.soilUnit} ${r.cropName}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'site') return a.siteName.localeCompare(b.siteName);
      if (sortKey === 'profile') return a.soilUnit.localeCompare(b.soilUnit);
      if (sortKey === 'crop') return a.cropName.localeCompare(b.cropName);
      return classDegree(a.classe) - classDegree(b.classe);
    });

  if (!projectId) {
    return (
      <div className="max-w-4xl">
        <PageTitle>{t('matrix.title')}</PageTitle>
        <Banner tone="info">Sélectionnez d'abord un projet.</Banner>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageTitle>{t('matrix.title')}</PageTitle>

      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <TextField placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Banner tone="info">
          {t('common.noData')} — assurez-vous d'avoir des sites avec climat, des profils, et des cultures évaluables (voir « {t('nav.cropEvaluation')} »).
        </Banner>
      ) : (
        <ScrollTable>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-raised)' }}>
              <th className="text-left p-2 cursor-pointer" onClick={() => setSortKey('site')}>
                {t('matrix.site')}
              </th>
              <th className="text-left p-2 cursor-pointer" onClick={() => setSortKey('profile')}>
                Profil
              </th>
              <th className="text-left p-2 cursor-pointer" onClick={() => setSortKey('crop')}>
                {t('matrix.crop')}
              </th>
              <th className="text-left p-2 cursor-pointer" onClick={() => setSortKey('classe')}>
                {t('matrix.class')}
              </th>
              <th className="text-right p-2">{t('matrix.landIndex')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="p-2">{r.siteName}</td>
                <td className="p-2">{r.soilUnit}</td>
                <td className="p-2">{r.cropName}</td>
                <td className="p-2">
                  <ClassBadge classe={r.classe} size="sm" />
                </td>
                <td className="p-2 text-right tabular-nums">{r.landIndex.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </ScrollTable>
      )}
    </div>
  );
}
