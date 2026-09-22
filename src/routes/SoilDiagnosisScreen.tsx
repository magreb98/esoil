import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { Banner, Card, PageTitle, ScrollTable, SectionTitle } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { weightedSliceAverage, fixedDepthAverage } from '../lib/soil/aggregation';
import { computeCecClay, baseSaturationPct } from '../lib/soil/cecClay';
import { classifyTexture } from '../lib/soil/texture';
import { computeFertilityIndicators } from '../lib/soil/indicators';
import methodConfig from '../config/method.json';

export function SoilDiagnosisScreen() {
  const { t } = useTranslation();
  const { profileId } = useSelection();
  const profile = useLiveQuery(() => (profileId ? db.profiles.get(profileId) : undefined), [profileId]);

  if (!profileId || !profile) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('soilDiagnosis.title')}</PageTitle>
        <Banner tone="info">Sélectionnez d'abord un profil dans l'écran « {t('nav.profiles')} ».</Banner>
      </div>
    );
  }

  if (profile.horizons.length === 0) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('soilDiagnosis.title')}</PageTitle>
        <Banner tone="warning">Ce profil n'a aucun horizon décrit.</Banner>
      </div>
    );
  }

  const fixed = methodConfig.fixedDepthRules;
  const clayResult = weightedSliceAverage(profile, (h) => h.clayPct, 'annuelle', profile.effectiveDepthCm, 'Argile');
  const siltResult = weightedSliceAverage(profile, (h) => h.siltPct, 'annuelle', profile.effectiveDepthCm, 'Limon');
  const sandResult = weightedSliceAverage(profile, (h) => h.sandPct, 'annuelle', profile.effectiveDepthCm, 'Sable');
  const baseSatResult = weightedSliceAverage(profile, baseSaturationPct, 'annuelle', profile.effectiveDepthCm, 'Saturation en bases');
  const ocResult = fixedDepthAverage(profile.horizons, (h) => h.organicCarbonPct, fixed.organicCarbon.fromCm, fixed.organicCarbon.toCm, 'Carbone organique');
  const phResult = fixedDepthAverage(profile.horizons, (h) => h.phWater, fixed.phWater.fromCm, fixed.phWater.toCm, 'pH eau');
  const cecClay = computeCecClay(profile);
  const texture = classifyTexture(sandResult.value, siltResult.value, clayResult.value, profile.horizons[0]?.structure);

  const rows: Array<{ label: string; value: string; trace: string[] }> = [
    { label: 'Argile (texture améliorée)', value: `${clayResult.value.toFixed(1)}%`, trace: clayResult.trace },
    { label: 'Saturation en bases (upgraded)', value: `${baseSatResult.value.toFixed(1)}%`, trace: baseSatResult.trace },
    { label: 'Carbone organique', value: `${ocResult.value.toFixed(2)}%`, trace: ocResult.trace },
    { label: 'pH eau', value: phResult.value.toFixed(2), trace: phResult.trace },
    { label: 'CEC de l\'argile', value: cecClay.value !== null ? `${cecClay.value.toFixed(1)} cmol(+)/kg` : t('common.missingData'), trace: cecClay.trace },
  ];

  return (
    <div className="max-w-4xl">
      <PageTitle>{t('soilDiagnosis.title')}</PageTitle>
      <Banner tone="info">
        Valeurs agrégées avec pondération générique (culture non spécifiée : hypothèse annuelle, profondeur effective {profile.effectiveDepthCm}cm). Sélectionnez une
        culture dans « {t('nav.cropEvaluation')} » pour les facteurs de pondération exacts (§4.1).
      </Banner>

      <div className="my-4">
        <SectionTitle>{t('soilDiagnosis.texture')}</SectionTitle>
        <Card>
          <p className="text-lg font-mono font-semibold mb-2" style={{ color: 'var(--color-vegetal)' }}>
            {texture.sysCode}
          </p>
          <ul className="text-sm m-0 pl-4" style={{ color: 'var(--color-foreground-muted)' }}>
            {texture.trace.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </Card>
      </div>

      <SectionTitle>Valeurs agrégées</SectionTitle>
      <ScrollTable>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <th className="text-left p-2">Paramètre</th>
            <th className="text-left p-2">Valeur</th>
            <th className="text-left p-2">{t('soilDiagnosis.depthRuleApplied')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t align-top" style={{ borderColor: 'var(--color-border)' }}>
              <td className="p-2 font-medium">{r.label}</td>
              <td className="p-2 tabular-nums">{r.value}</td>
              <td className="p-2 text-xs" style={{ color: 'var(--color-foreground-muted)' }}>
                {r.trace[0]}
              </td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>

      <div className="mt-6">
        <SectionTitle>{t('soilDiagnosis.appreciation')}</SectionTitle>
        <Banner tone="warning">Bandes d'appréciation provisoires/génériques (§4.4) — les annexes 4-9 du mémoire ne sont pas dans le dépôt.</Banner>
        <div className="mt-3 flex flex-col gap-3">
          {profile.horizons.map((h) => {
            const indicators = computeFertilityIndicators(h);
            return (
              <Card key={h.code}>
                <p className="font-mono font-semibold mb-2">
                  {h.code} ({h.topCm}-{h.bottomCm}cm)
                </p>
                <ul className="text-sm m-0 pl-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <li>pH : {indicators.appreciations.phWater}</li>
                  <li>Carbone organique : {indicators.appreciations.organicCarbon}</li>
                  <li>Matière organique ({indicators.organicMatterPct.toFixed(1)}%) : {indicators.appreciations.organicMatter}</li>
                  <li>Saturation en bases ({indicators.baseSaturationPct.toFixed(1)}%) : {indicators.appreciations.baseSaturation}</li>
                  {indicators.appreciations.cnRatio && <li>Rapport C/N : {indicators.appreciations.cnRatio}</li>}
                  {indicators.appreciations.assimilableP && <li>P assimilable : {indicators.appreciations.assimilableP}</li>}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
