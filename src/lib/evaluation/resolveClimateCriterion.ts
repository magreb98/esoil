/**
 * Résout la « valeur retenue » d'un critère climatique à partir de la série climatique.
 * Les codes reconnus correspondent aux critères transcrits pour le palmier à huile (§9).
 * Un code non reconnu est listé dans `missingCriteria` plutôt que calculé silencieusement.
 */
import type { MonthlyClimate } from '../domain/types';
import { computeThornthwaiteETP } from '../climate/thornthwaite';
import { computeGrowingPeriod } from '../climate/growingPeriod';
import { annualInsolationRatio } from '../climate/insolation';
import { DEFAULT_METHOD_PARAMETERS } from '../domain/types';

export interface ResolvedClimateValue {
  value: number;
  trace: string[];
}

export function resolveClimateCriterion(
  code: string,
  months: MonthlyClimate[],
  latitudeDeg: number,
  reserveMaxMm: number = DEFAULT_METHOD_PARAMETERS.waterHoldingCapacityMm
): ResolvedClimateValue | null {
  const sorted = [...months].sort((a, b) => a.month - b.month);

  switch (code) {
    case 'precip_annuelle': {
      const value = sorted.reduce((s, m) => s + m.precipitationMm, 0);
      return { value, trace: [`Précipitations annuelles = Σ des 12 mois = ${value.toFixed(2)}mm`] };
    }
    case 't_moy_annuelle': {
      const value = sorted.reduce((s, m) => s + m.tMeanC, 0) / sorted.length;
      return { value, trace: [`Température moyenne annuelle = moyenne des 12 mois = ${value.toFixed(2)}°C`] };
    }
    case 't_min_abs_mois_froid': {
      const value = Math.min(...sorted.map((m) => m.tMinC));
      return { value, trace: [`Température minimale absolue du mois le plus froid = ${value.toFixed(2)}°C`] };
    }
    case 't_moy_min_cycle':
    case 't_min_moy_cycle': {
      // Pérenne : cycle = année entière (§5.3). Annuelle : cycle calé sur la date de semis — non implémenté (gap connu, écran Potentiel).
      const value = sorted.reduce((s, m) => s + m.tMinC, 0) / sorted.length;
      return { value, trace: [`Température moyenne minimale du cycle (année entière, hypothèse pérenne) = ${value.toFixed(2)}°C`] };
    }
    case 't_min_moy_mois_froid': {
      const coldest = sorted.reduce((min, m) => (m.tMeanC < min.tMeanC ? m : min), sorted[0]!);
      return { value: coldest.tMinC, trace: [`Température minimale moyenne du mois le plus froid (mois ${coldest.month}) = ${coldest.tMinC.toFixed(2)}°C`] };
    }
    case 'hr_annuelle': {
      const withHr = sorted.filter((m) => m.relativeHumidityPct !== undefined);
      if (withHr.length === 0) return null;
      const value = withHr.reduce((s, m) => s + m.relativeHumidityPct!, 0) / withHr.length;
      return { value, trace: [`Humidité relative annuelle = moyenne des mois saisis = ${value.toFixed(1)}%`] };
    }
    case 'n_sur_N': {
      const ratio = annualInsolationRatio(sorted, latitudeDeg);
      if (ratio === null) return null;
      return { value: ratio, trace: [`Rapport d'insolation annuel n/N = ${ratio.toFixed(3)}`] };
    }
    case 'mois_secs': {
      const etpResult = computeThornthwaiteETP(sorted, latitudeDeg);
      const etpByMonth = new Map(etpResult.months.map((m) => [m.month, m.etpMm]));
      const gp = computeGrowingPeriod(sorted, etpByMonth, reserveMaxMm);
      return { value: gp.dryMonthsPerYear, trace: [`Nombre de mois secs (P < ½ETP) = ${gp.dryMonthsPerYear}`] };
    }
    default:
      return null;
  }
}
