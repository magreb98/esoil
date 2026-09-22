import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { Banner, Card, Label, PageTitle, SelectField } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { CROPS, isCropEvaluable } from '../config/crops';
import { evaluateCrop } from '../lib/evaluation/evaluateCrop';
import { estimateYield } from '../lib/yield/managementLevels';
import { ClassBadge } from '../components/ui/ClassBadge';
import type { ManagementLevel } from '../lib/domain/types';
import methodConfig from '../config/method.json';

export function YieldsScreen() {
  const { t } = useTranslation();
  const { profileId, siteId } = useSelection();
  const profile = useLiveQuery(() => (profileId ? db.profiles.get(profileId) : undefined), [profileId]);
  const site = useLiveQuery(() => (siteId ? db.sites.get(siteId) : undefined), [siteId]);
  const climateSeries = useLiveQuery(() => (siteId ? db.climateSeries.where('siteId').equals(siteId).first() : undefined), [siteId]);

  const [cropCode, setCropCode] = useState<string>(CROPS[0]?.code ?? '');
  const crop = CROPS.find((c) => c.code === cropCode) ?? CROPS[0];
  const [managementLevel, setManagementLevel] = useState<ManagementLevel>('intermediaire');

  if (!profileId || !profile || !site || !climateSeries || !crop || !isCropEvaluable(crop)) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('yields.title')}</PageTitle>
        <Banner tone="info">Sélectionnez un profil avec climat et une culture évaluable pour estimer un rendement.</Banner>
      </div>
    );
  }

  const evaluation = evaluateCrop(profile, climateSeries, crop, site);
  const yieldEstimate = estimateYield(crop.code, evaluation.parametric.classe, managementLevel);
  const levels = methodConfig.managementLevels;

  return (
    <div className="max-w-3xl">
      <PageTitle>{t('yields.title')}</PageTitle>

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Culture</Label>
            <SelectField value={crop.code} onChange={(e) => setCropCode(e.target.value)}>
              {CROPS.filter(isCropEvaluable).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label>{t('potential.managementLevel')}</Label>
            <SelectField value={managementLevel} onChange={(e) => setManagementLevel(e.target.value as ManagementLevel)}>
              {(['faible', 'intermediaire', 'eleve'] as const).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {levels[lvl].label}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>
          {levels[managementLevel].description}
        </p>
      </Card>

      <Card className="mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
          Classe (méthode paramétrique) :
        </span>
        <ClassBadge classe={evaluation.parametric.classe} />
      </Card>

      {yieldEstimate.correctionFactorGroup && (
        <div className="mb-4">
          <Banner tone={yieldEstimate.correctionFactorStatus === 'a_confirmer' ? 'warning' : 'info'}>
            Groupe de facteur de correction : « {yieldEstimate.correctionFactorGroup} »
            {yieldEstimate.correctionFactorStatus === 'a_confirmer' ? ' — affectation à confirmer' : ' — affectation vérifiée'}
            {yieldEstimate.correctionFactorNote ? ` (${yieldEstimate.correctionFactorNote})` : ''}
          </Banner>
        </div>
      )}

      {yieldEstimate.isDataMissing ? (
        <Banner tone="danger">
          {t('common.missingData')} — la table 7 (rendements, intrants élevés) ou le facteur de correction n'est pas disponible pour {crop.name}. Aucun
          rendement n'est estimé (§8.2 : ne jamais inventer une fourchette manquante).
        </Banner>
      ) : (
        <div className="flex flex-col gap-3">
          {yieldEstimate.entries.map((entry) => (
            <Card key={entry.yieldEntryCode}>
              <p className="text-sm font-medium mb-2">{entry.yieldEntryLabel}</p>
              {entry.rangeHighInputTPerHa ? (
                <>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-foreground-muted)' }}>
                    {t('yields.highInputRange')}
                  </p>
                  <p className="text-lg tabular-nums mb-3">
                    {entry.rangeHighInputTPerHa[0]} – {entry.rangeHighInputTPerHa[1]} {entry.unit}
                  </p>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-foreground-muted)' }}>
                    {t('yields.correctionFactor')} ({levels[managementLevel].label})
                  </p>
                  <p className="text-lg tabular-nums mb-3">× {yieldEstimate.correctionFactor}</p>
                  <p className="text-sm mb-1" style={{ color: 'var(--color-foreground-muted)' }}>
                    Rendement estimé
                  </p>
                  <p className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-vegetal)' }}>
                    {entry.estimatedRangeTPerHa ? `${entry.estimatedRangeTPerHa[0].toFixed(1)} – ${entry.estimatedRangeTPerHa[1].toFixed(1)} ${entry.unit}` : t('common.missingData')}
                  </p>
                  <p className="text-xs mt-3" style={{ color: 'var(--color-foreground-muted)' }}>
                    {t('common.theoreticalEstimate')} — {t('common.source')} : {entry.source}
                  </p>
                </>
              ) : (
                <Banner tone="danger">{t('common.missingData')} pour cette entrée du tableau 7.</Banner>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
