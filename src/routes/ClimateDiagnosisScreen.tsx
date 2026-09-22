import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../db/schema';
import { Banner, Card, PageTitle, SectionTitle } from '../components/ui/primitives';
import { useSelection } from '../hooks/useSelection';
import { computeThornthwaiteETP } from '../lib/climate/thornthwaite';
import { computeGrowingPeriod } from '../lib/climate/growingPeriod';
import { annualInsolationRatio } from '../lib/climate/insolation';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export function ClimateDiagnosisScreen() {
  const { t } = useTranslation();
  const { siteId } = useSelection();
  const site = useLiveQuery(() => (siteId ? db.sites.get(siteId) : undefined), [siteId]);
  const climateSeries = useLiveQuery(() => (siteId ? db.climateSeries.where('siteId').equals(siteId).first() : undefined), [siteId]);

  if (!siteId || !site) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('climateDiagnosis.title')}</PageTitle>
        <Banner tone="info">Sélectionnez d'abord un site dans l'écran « {t('nav.site')} ».</Banner>
      </div>
    );
  }

  if (!climateSeries) {
    return (
      <div className="max-w-3xl">
        <PageTitle>{t('climateDiagnosis.title')}</PageTitle>
        <Banner tone="warning">Aucune série climatique saisie pour ce site — voir l'écran « {t('nav.site')} ».</Banner>
      </div>
    );
  }

  const thorn = computeThornthwaiteETP(climateSeries.months, site.latitude);
  const etpByMonth = new Map(thorn.months.map((m) => [m.month, m.etpMm]));
  const gp = computeGrowingPeriod(climateSeries.months, etpByMonth, site.methodParameters.waterHoldingCapacityMm);
  const nOverN = annualInsolationRatio(climateSeries.months, site.latitude);

  const chartData = climateSeries.months
    .slice()
    .sort((a, b) => a.month - b.month)
    .map((m) => ({
      mois: MONTH_LABELS[m.month - 1],
      P: m.precipitationMm,
      ETP: etpByMonth.get(m.month) ?? 0,
      '½ETP': (etpByMonth.get(m.month) ?? 0) / 2,
    }));

  return (
    <div className="max-w-4xl">
      <PageTitle>
        {t('climateDiagnosis.title')} — {site.name}
      </PageTitle>

      {climateSeries.source === 'nasa_power' && (
        <div className="mb-4">
          <Banner tone="info">Série importée depuis un CSV NASA POWER (analyse non testée sur fichier réel — vérifier les valeurs).</Banner>
        </div>
      )}
      {site.methodParameters.etpSource === 'thornthwaite' && (
        <div className="mb-4">
          <Banner tone="warning">
            ETP calculée par Thornthwaite. Écart connu à Ndoupe : ~1314mm calculés vs ~1033mm mémoire — vérifiez la source si le résultat semble
            décalé (§5.1 [À CONFIRMER]).
          </Banner>
        </div>
      )}

      <Card className="mb-4">
        <SectionTitle>P / ETP / ½ETP</SectionTitle>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mois" stroke="var(--color-foreground-muted)" fontSize={12} />
              <YAxis stroke="var(--color-foreground-muted)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border-strong)' }} />
              <Legend />
              <Line type="monotone" dataKey="P" stroke="var(--color-vegetal)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ETP" stroke="var(--color-terracotta)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="½ETP" stroke="var(--degree-2)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card>
          <p className="text-sm mb-1" style={{ color: 'var(--color-foreground-muted)' }}>
            {t('climateDiagnosis.dryMonths')} (P &lt; ½ETP)
          </p>
          <p className="text-2xl font-semibold tabular-nums">{gp.dryMonthsPerYear}</p>
        </Card>
        <Card>
          <p className="text-sm mb-1" style={{ color: 'var(--color-foreground-muted)' }}>
            {t('climateDiagnosis.insolation')}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{nOverN !== null ? nOverN.toFixed(2) : t('common.missingData')}</p>
        </Card>
        <Card>
          <p className="text-sm mb-1" style={{ color: 'var(--color-foreground-muted)' }}>
            ETP annuelle
          </p>
          <p className="text-2xl font-semibold tabular-nums">{thorn.totalEtpMm.toFixed(0)} mm</p>
        </Card>
      </div>

      <Card className="mb-4">
        <SectionTitle>{t('climateDiagnosis.growingPeriod')}</SectionTitle>
        {gp.segments.length === 0 ? (
          <Banner tone="warning">Aucune période de croissance détectée (P jamais &gt; ½ETP).</Banner>
        ) : (
          <ul className="text-sm m-0 pl-4">
            {gp.segments.map((s, i) => (
              <li key={i} className="mb-1">
                Mois {MONTH_LABELS[s.startMonth - 1]} → fin des pluies {MONTH_LABELS[s.endOfRainsMonth - 1]}, réserve épuisée en{' '}
                {s.reserveDepletionDaysZ.toFixed(0)}j supplémentaires — durée totale ≈ {s.totalDurationDays.toFixed(0)} jours
              </li>
            ))}
          </ul>
        )}
        {gp.merged && <p className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>Périodes fusionnées (déficit &lt; 50mm entre elles, §5.2)</p>}
        {gp.dormantMonths.length > 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-foreground-muted)' }}>
            Dormance (T moy &lt; 6,5°C) : {gp.dormantMonths.map((m) => MONTH_LABELS[m - 1]).join(', ')}
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle>{t('climateDiagnosis.thornthwaiteDetail')}</SectionTitle>
        <p className="text-sm mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
          I = {thorn.annualHeatIndex_I.toFixed(2)} ; a = {thorn.exponent_a.toFixed(4)}
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse tabular-nums">
            <thead>
              <tr>
                <th className="text-left p-1">Mois</th>
                <th className="text-right p-1">i</th>
                <th className="text-right p-1">N (h)</th>
                <th className="text-right p-1">ETP (mm)</th>
                <th className="text-left p-1 pl-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {thorn.months.map((m) => (
                <tr key={m.month} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="p-1">{MONTH_LABELS[m.month - 1]}</td>
                  <td className="p-1 text-right">{m.heatIndex_i.toFixed(2)}</td>
                  <td className="p-1 text-right">{m.daylightHoursN.toFixed(2)}</td>
                  <td className="p-1 text-right">{m.etpMm.toFixed(1)}</td>
                  <td className="p-1 pl-2 text-xs" style={{ color: 'var(--color-foreground-muted)' }}>
                    {m.source === 'saisie_manuelle' ? 'saisie' : 'Thornthwaite'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
