import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { Banner, Card, PageTitle, SectionTitle, SelectField } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { CROPS, isCropEvaluable } from '../config/crops';
import { evaluateCrop } from '../lib/evaluation/evaluateCrop';
import { applyPotentialCorrections, DEFAULT_POTENTIAL_SCENARIO } from '../lib/evaluation/potential';
import { computeLowestClass } from '../lib/evaluation/lowestClass';
import { computeNumberIntensity } from '../lib/evaluation/numberIntensity';
import { computeParametric } from '../lib/evaluation/parametric';
import { computeFinalNotation } from '../lib/evaluation/notation';
import { ClassBadge } from '../components/ui/ClassBadge';
import { LIMITATION_CATEGORIES, LIMITATION_CATEGORY_LABELS, type LimitationCategory } from '../lib/domain/types';
import methodConfig from '../config/method.json';

export function PotentialScreen() {
  const { t } = useTranslation();
  const { profileId, siteId } = useSelection();
  const profile = useLiveQuery(() => (profileId ? db.profiles.get(profileId) : undefined), [profileId]);
  const site = useLiveQuery(() => (siteId ? db.sites.get(siteId) : undefined), [siteId]);
  const climateSeries = useLiveQuery(() => (siteId ? db.climateSeries.where('siteId').equals(siteId).first() : undefined), [siteId]);

  const [cropCode, setCropCode] = useState<string>(CROPS[0]?.code ?? '');
  const crop = CROPS.find((c) => c.code === cropCode) ?? CROPS[0];
  const [corrections, setCorrections] = useState<LimitationCategory[]>(DEFAULT_POTENTIAL_SCENARIO.correctedCategories);

  if (!profileId || !profile || !site || !climateSeries || !crop || !isCropEvaluable(crop)) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('potential.title')}</PageTitle>
        <Banner tone="info">
          Sélectionnez un profil avec climat et une culture évaluable (« {t('nav.cropEvaluation')} ») pour utiliser le simulateur.
        </Banner>
      </div>
    );
  }

  const current = evaluateCrop(profile, climateSeries, crop, site);
  const correctedClimate = applyPotentialCorrections(current.climateRatings, { correctedCategories: corrections });
  const correctedSoil = applyPotentialCorrections(current.soilRatings, { correctedCategories: corrections });
  const potentialLowest = computeLowestClass([...correctedClimate, ...correctedSoil]);
  const potentialNumberIntensity = computeNumberIntensity(correctedClimate, correctedSoil);
  const potentialParametric = computeParametric(correctedClimate, correctedSoil);
  const potentialNotation = computeFinalNotation(potentialLowest, potentialNumberIntensity, potentialParametric);

  function toggleCategory(cat: LimitationCategory) {
    setCorrections((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  const neverCorrectable = new Set(methodConfig.potentialCorrections.neverCorrectableCategories as LimitationCategory[]);

  return (
    <div className="max-w-4xl">
      <PageTitle>{t('potential.title')}</PageTitle>
      <Banner tone="warning">
        Liste des corrections admises [À CONFIRMER, §8.1] : par défaut, humidité (w), fertilité (f) et salinité/sodicité (n) sont considérées
        corrigibles ; le climat (c) ne l'est jamais.
      </Banner>

      <Card className="my-4">
        <SelectField value={crop.code} onChange={(e) => setCropCode(e.target.value)}>
          {CROPS.filter(isCropEvaluable).map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </SelectField>
      </Card>

      <Card className="mb-4">
        <SectionTitle>{t('potential.selectCorrections')}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {LIMITATION_CATEGORIES.map((cat) => {
            const disabled = neverCorrectable.has(cat);
            const checked = corrections.includes(cat);
            return (
              <label
                key={cat}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 min-h-[48px] text-sm cursor-pointer"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  opacity: disabled ? 0.5 : 1,
                  backgroundColor: checked ? 'var(--color-vegetal-soft)' : 'transparent',
                }}
              >
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCategory(cat)} />
                {LIMITATION_CATEGORY_LABELS[cat]}
                {disabled && ' (jamais corrigible)'}
              </label>
            );
          })}
        </div>
      </Card>

      <SectionTitle>{t('potential.currentVsPotential')}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <p className="text-sm mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
            Actuel
          </p>
          <ClassBadge classe={current.finalNotation} />
        </Card>
        <Card>
          <p className="text-sm mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
            Potentiel
          </p>
          <ClassBadge classe={potentialNotation.finalNotation} />
        </Card>
      </div>

      {crop.lifecycle === 'annuelle' && (
        <div className="mt-4">
          <Banner tone="warning">
            Comparaison de dates de semis (cultures annuelles, p.48-49) non implémentée : l'interpolation par décades D3 et les formules jour/nuit
            de la p.34 ne sont pas transcrites dans la spécification [À CONFIRMER].
          </Banner>
        </div>
      )}
    </div>
  );
}
