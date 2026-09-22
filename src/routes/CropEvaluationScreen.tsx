import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { Banner, Card, PageTitle, ScrollTable, SectionTitle, SelectField } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { CROPS, isCropEvaluable } from '../config/crops';
import { evaluateCrop } from '../lib/evaluation/evaluateCrop';
import { ClassBadge, DegreeBadge } from '../components/ui/ClassBadge';
import { GlossaryTerm } from '../components/ui/GlossaryTerm';
import { LIMITATION_CATEGORIES, LIMITATION_CATEGORY_LABELS, type CriterionRating } from '../lib/domain/types';
import { buildNdoupeComparison } from '../lib/comparison/ndoupeComparison';

const CONFIDENCE_ICON: Record<string, string> = { moyenne: '⚠', faible: '⚠⚠' };

function CriteriaTable({ ratings, title }: { ratings: CriterionRating[]; title: string }) {
  if (ratings.length === 0) return null;
  return (
    <div className="mb-4">
      <SectionTitle>{title}</SectionTitle>
      <ScrollTable>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <th className="text-left p-2">Caractéristique</th>
            <th className="text-right p-2">Valeur</th>
            <th className="text-left p-2">Classe</th>
            <th className="text-left p-2">Degré</th>
            <th className="text-right p-2">Val. param.</th>
            <th className="text-left p-2">Catégorie</th>
            <th className="text-left p-2">Fiabilité</th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((r) => (
            <tr key={r.criterionCode} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
              <td className="p-2">{r.label}</td>
              <td className="p-2 text-right tabular-nums">
                {typeof r.valeurRetenue === 'number' ? r.valeurRetenue.toFixed(2) : r.valeurRetenue} {r.unit ?? ''}
              </td>
              <td className="p-2">
                <ClassBadge classe={r.classe} size="sm" />
              </td>
              <td className="p-2">
                <DegreeBadge degree={r.degre} />
              </td>
              <td className="p-2 text-right tabular-nums">{r.valeurParametrique.toFixed(1)}</td>
              <td className="p-2">
                <GlossaryTerm section="categories" code={r.category}>
                  {r.category}
                </GlossaryTerm>
              </td>
              <td className="p-2" title={r.note ?? r.confidence}>
                {r.confidence !== 'haute' && (
                  <span style={{ color: 'var(--degree-2)' }}>
                    {CONFIDENCE_ICON[r.confidence]} {r.confidence}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>
    </div>
  );
}

export function CropEvaluationScreen() {
  const { t } = useTranslation();
  const { profileId, siteId } = useSelection();
  const profile = useLiveQuery(() => (profileId ? db.profiles.get(profileId) : undefined), [profileId]);
  const site = useLiveQuery(() => (siteId ? db.sites.get(siteId) : undefined), [siteId]);
  const climateSeries = useLiveQuery(() => (siteId ? db.climateSeries.where('siteId').equals(siteId).first() : undefined), [siteId]);

  const [cropCode, setCropCode] = useState<string>(CROPS[0]?.code ?? '');
  const crop = CROPS.find((c) => c.code === cropCode) ?? CROPS[0];

  if (!profileId || !profile) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('cropEvaluation.title')}</PageTitle>
        <Banner tone="info">Sélectionnez d'abord un profil dans l'écran « {t('nav.profiles')} ».</Banner>
      </div>
    );
  }
  if (!climateSeries || !site) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('cropEvaluation.title')}</PageTitle>
        <Banner tone="warning">Aucune série climatique pour ce site — voir l'écran « {t('nav.site')} ».</Banner>
      </div>
    );
  }
  if (!crop) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('cropEvaluation.title')}</PageTitle>
        <Banner tone="danger">Aucune culture disponible dans le registre.</Banner>
      </div>
    );
  }

  const evaluable = isCropEvaluable(crop);
  const evaluation = evaluable ? evaluateCrop(profile, climateSeries, crop, site) : null;

  return (
    <div className="max-w-5xl">
      <PageTitle>{t('cropEvaluation.title')}</PageTitle>

      <Card className="mb-4">
        <SelectField value={crop.code} onChange={(e) => setCropCode(e.target.value)}>
          {CROPS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} {isCropEvaluable(c) ? '' : '(données manquantes)'}
            </option>
          ))}
        </SelectField>
      </Card>

      {crop.verificationStatus !== 'verifie' && (
        <div className="mb-4">
          <Banner tone="warning">
            {t('common.provisionalResult')} — table d'exigences « {crop.verificationStatus === 'manquant' ? 'manquante' : 'transcrite, non vérifiée'} » ({crop.source}).
          </Banner>
        </div>
      )}

      {!evaluable && (
        <Banner tone="danger">
          Aucun critère (climat ou sol) n'est transcrit pour {crop.name}. Aucune évaluation d'aptitude n'est calculée — voir le registre des cultures
          (§9).
        </Banner>
      )}

      {evaluation && (
        <>
          {evaluation.missingCriteria.length > 0 && (
            <div className="mb-4">
              <Banner tone="warning">
                <strong>{t('cropEvaluation.missingCriteria')} :</strong>
                <ul className="m-0 pl-4 mt-1">
                  {evaluation.missingCriteria.map((m, i) => (
                    <li key={i}>
                      {m.label} : {m.reason}
                    </li>
                  ))}
                </ul>
              </Banner>
            </div>
          )}

          <Card className="mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
                Notation finale :
              </span>
              <ClassBadge classe={evaluation.finalNotation} />
              {!evaluation.methodsAgree && (
                <span className="text-sm" style={{ color: 'var(--degree-3)' }}>
                  ⚠ {t('cropEvaluation.disagreement')}
                </span>
              )}
            </div>
          </Card>

          <SectionTitle>{t('cropEvaluation.threeMethods')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card>
              <p className="text-sm mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
                {t('cropEvaluation.lowestClass')}
              </p>
              <ClassBadge classe={evaluation.lowestClass.classe} />
              <p className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>
                Limité par : {evaluation.lowestClass.limitingCategories.map((c) => LIMITATION_CATEGORY_LABELS[c]).join(', ') || '—'}
              </p>
            </Card>
            <Card>
              <p className="text-sm mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
                {t('cropEvaluation.numberIntensity')}
              </p>
              <ClassBadge classe={evaluation.numberIntensity.classe} />
              <p className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>
                Climat {evaluation.numberIntensity.classeClimat} / Sol {evaluation.numberIntensity.classeSol}
              </p>
            </Card>
            <Card>
              <p className="text-sm mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
                {t('cropEvaluation.parametric')}
              </p>
              <ClassBadge classe={evaluation.parametric.classe} />
              <p className="text-xs mt-2 tabular-nums" style={{ color: 'var(--color-foreground-muted)' }}>
                IT = {evaluation.parametric.indiceTerre.toFixed(1)}
              </p>
            </Card>
          </div>

          <Card className="mb-6">
            <SectionTitle>{t('cropEvaluation.chain')}</SectionTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm tabular-nums font-mono">
              <Chip label="CI" value={evaluation.parametric.indiceClimatique.toFixed(2)} term="CI" />
              <Arrow />
              <Chip label="CR" value={evaluation.parametric.tauxClimatique.toFixed(2)} term="CR" />
              <Arrow />
              <Chip label="IS" value={evaluation.parametric.indiceSol.toFixed(2)} term="IS" />
              <Arrow />
              <Chip label="IT" value={evaluation.parametric.indiceTerre.toFixed(2)} term="IT" />
              <Arrow />
              <ClassBadge classe={evaluation.parametric.classe} size="sm" />
            </div>
          </Card>

          <CriteriaTable ratings={evaluation.climateRatings} title={t('cropEvaluation.climateTable')} />
          <CriteriaTable ratings={evaluation.soilRatings} title={t('cropEvaluation.soilTable')} />

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">Traçabilité complète (par catégorie)</summary>
            <div className="mt-2 text-sm">
              {LIMITATION_CATEGORIES.map((cat) => (
                <p key={cat}>
                  <GlossaryTerm section="categories" code={cat}>
                    {LIMITATION_CATEGORY_LABELS[cat]}
                  </GlossaryTerm>
                  : {evaluation.lowestClass.parCategorie[cat] ?? '—'}
                </p>
              ))}
            </div>
          </details>

          {site.name.toLowerCase().includes('ndoupe') && crop.code === 'oil_palm' && <NdoupeComparisonSection />}
        </>
      )}
    </div>
  );
}

function NdoupeComparisonSection() {
  const [open, setOpen] = useState(false);
  const comparison = useMemo(() => (open ? buildNdoupeComparison() : null), [open]);

  return (
    <div className="mt-6">
      <button
        type="button"
        className="text-sm font-medium underline cursor-pointer"
        style={{ color: 'var(--color-vegetal)' }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Masquer' : 'Afficher'} la comparaison avec le mémoire GWETH (Ndoupe)
      </button>
      {comparison && (
        <div className="mt-3 flex flex-col gap-4">
          <Banner tone="info">
            Comparaison, critère par critère, entre les valeurs du mémoire (tableaux 3 et 4, p.46-47) et celles recalculées en direct par le moteur
            contre les bornes de référence du palmier à huile. Les écarts connus (§10.2 du prompt v2) sont expliqués sous chaque ligne concernée.
          </Banner>
          <ComparisonTable title="Climat (tableau 3, memoire_p60)" rows={comparison.climate} />
          <ComparisonTable title="Sol, unité I (tableau 4, memoire_p61)" rows={comparison.soil} />
          <Card>
            <SectionTitle>Écarts d'agrégation (indices et formules)</SectionTitle>
            <ul className="text-sm m-0 pl-4 flex flex-col gap-2">
              {comparison.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function ComparisonTable({ title, rows }: { title: string; rows: ReturnType<typeof buildNdoupeComparison>['climate'] }) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <ScrollTable>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <th className="text-left p-2">Critère</th>
            <th className="text-right p-2">Valeur</th>
            <th className="text-left p-2">Mémoire</th>
            <th className="text-left p-2">Moteur</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diverges = 'classe' in r.moteur && r.moteur.classe !== r.memoireClasse;
            return (
              <tr key={r.label} className="border-t align-top" style={{ borderColor: 'var(--color-border)' }}>
                <td className="p-2">{r.label}</td>
                <td className="p-2 text-right tabular-nums">{r.value}</td>
                <td className="p-2">
                  <ClassBadge classe={r.memoireClasse} size="sm" /> <span className="tabular-nums text-xs">{r.memoireRatio}</span>
                </td>
                <td className="p-2">
                  {'classe' in r.moteur ? (
                    <>
                      <ClassBadge classe={r.moteur.classe} size="sm" /> <span className="tabular-nums text-xs">{r.moteur.ratio}</span>
                      {diverges && (
                        <span className="ml-1 text-xs" style={{ color: 'var(--degree-3)' }}>
                          ⚠ écart
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>
                      {r.moteur.indisponible}
                    </span>
                  )}
                  {r.ecart && (
                    <p className="text-xs mt-1 m-0" style={{ color: 'var(--color-foreground-muted)' }}>
                      {r.ecart}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </ScrollTable>
    </div>
  );
}

function Chip({ value, term }: { label: string; value: string; term: 'CI' | 'CR' | 'IS' | 'IT' }) {
  return (
    <span className="rounded-md border px-2 py-1" style={{ borderColor: 'var(--color-border-strong)' }}>
      <GlossaryTerm section="indices" code={term}>
        {term}
      </GlossaryTerm>{' '}
      = {value}
    </span>
  );
}

function Arrow() {
  return (
    <span aria-hidden="true" style={{ color: 'var(--color-foreground-muted)' }}>
      →
    </span>
  );
}
