/**
 * Rapport d'insolation n/N (§5.3). N calculé par astronomie (daylength.ts).
 * n (heures d'ensoleillement effectif) doit être saisi par l'utilisateur : NASA POWER ne le
 * fournit pas directement [À CONFIRMER : source de n].
 */
import type { MonthlyClimate } from '../domain/types';
import { monthlyDayLengthHours } from './daylength';

export interface InsolationRatioResult {
  month: number;
  n: number | null;
  N: number;
  ratio: number | null;
}

export function computeInsolationRatios(months: MonthlyClimate[], latitudeDeg: number): InsolationRatioResult[] {
  return months
    .slice()
    .sort((a, b) => a.month - b.month)
    .map((m) => {
      const N = monthlyDayLengthHours(latitudeDeg, m.month);
      const n = m.sunshineHoursN ?? null;
      return { month: m.month, n, N, ratio: n !== null && N > 0 ? n / N : null };
    });
}

export function annualInsolationRatio(months: MonthlyClimate[], latitudeDeg: number): number | null {
  const ratios = computeInsolationRatios(months, latitudeDeg);
  const withData = ratios.filter((r) => r.ratio !== null);
  if (withData.length === 0) return null;
  const nTotal = withData.reduce((s, r) => s + (r.n ?? 0), 0);
  const NTotal = withData.reduce((s, r) => s + r.N, 0);
  return NTotal > 0 ? nTotal / NTotal : null;
}
