/**
 * ETP de Thornthwaite (§5.1). Si l'utilisateur fournit sa propre ETP mensuelle (petMm),
 * elle prime sur ce calcul — voir l'écart connu (~1314mm calculé vs ~1033mm mémoire à Ndoupe).
 */
import type { MonthlyClimate } from '../domain/types';
import { monthlyDayLengthHours } from './daylength';

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface ThornthwaiteMonthResult {
  month: number;
  heatIndex_i: number;
  etpNonCorrigeeMm: number;
  daylightHoursN: number;
  etpMm: number;
  source: 'thornthwaite' | 'saisie_manuelle';
}

export interface ThornthwaiteResult {
  months: ThornthwaiteMonthResult[];
  annualHeatIndex_I: number;
  exponent_a: number;
  totalEtpMm: number;
}

function heatIndex(tMeanC: number): number {
  return tMeanC > 0 ? Math.pow(tMeanC / 5, 1.514) : 0;
}

export function computeThornthwaiteETP(months: MonthlyClimate[], latitudeDeg: number): ThornthwaiteResult {
  const sorted = [...months].sort((a, b) => a.month - b.month);
  const heatIndices = sorted.map((m) => heatIndex(m.tMeanC));
  const I = heatIndices.reduce((s, i) => s + i, 0);
  const a = 6.75e-7 * I ** 3 - 7.71e-5 * I ** 2 + 1.792e-2 * I + 0.49239;

  const results: ThornthwaiteMonthResult[] = sorted.map((m, idx) => {
    if (m.petMm !== undefined) {
      return {
        month: m.month,
        heatIndex_i: heatIndices[idx]!,
        etpNonCorrigeeMm: m.petMm,
        daylightHoursN: monthlyDayLengthHours(latitudeDeg, m.month),
        etpMm: m.petMm,
        source: 'saisie_manuelle',
      };
    }
    const N = monthlyDayLengthHours(latitudeDeg, m.month);
    const days = DAYS_IN_MONTH[m.month - 1] ?? 30;
    const etpNonCorrigee = m.tMeanC > 0 && I > 0 ? 16 * Math.pow((10 * m.tMeanC) / I, a) : 0;
    const etp = etpNonCorrigee * (N / 12) * (days / 30);
    return {
      month: m.month,
      heatIndex_i: heatIndices[idx]!,
      etpNonCorrigeeMm: etpNonCorrigee,
      daylightHoursN: N,
      etpMm: etp,
      source: 'thornthwaite',
    };
  });

  return {
    months: results,
    annualHeatIndex_I: I,
    exponent_a: a,
    totalEtpMm: results.reduce((s, r) => s + r.etpMm, 0),
  };
}
