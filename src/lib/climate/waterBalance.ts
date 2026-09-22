/**
 * Bilan hydrique mensuel à réservoir (réserve utile, défaut 100mm — §5.2 [À CONFIRMER]).
 * Utilisé pour estimer Z, le nombre de jours d'épuisement de la réserve après la fin des pluies.
 */
import type { MonthlyClimate } from '../domain/types';

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface WaterBalanceMonth {
  month: number;
  precipitationMm: number;
  etpMm: number;
  reservoirStartMm: number;
  reservoirEndMm: number;
  surplusMm: number; // P - ETP - recharge, perdu si réservoir plein
  deficitMm: number; // ETP - P non couvert par le réservoir
}

/** Simule le réservoir sur 12 mois (cycle bouclé) en partant d'un réservoir plein en fin de saison humide. */
export function simulateWaterBalance(months: MonthlyClimate[], etpByMonth: Map<number, number>, reserveMaxMm: number, startMonth: number): WaterBalanceMonth[] {
  const sorted = [...months].sort((a, b) => a.month - b.month);
  const ordered: MonthlyClimate[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const found = sorted.find((x) => x.month === m);
    if (found) ordered.push(found);
  }

  let reservoir = reserveMaxMm;
  const results: WaterBalanceMonth[] = [];
  for (const m of ordered) {
    const etp = etpByMonth.get(m.month) ?? 0;
    const reservoirStart = reservoir;
    const net = m.precipitationMm - etp;
    let surplus = 0;
    let deficit = 0;
    if (net >= 0) {
      reservoir = Math.min(reserveMaxMm, reservoir + net);
      surplus = Math.max(0, reservoirStart + net - reserveMaxMm);
    } else {
      const available = reservoir;
      const drawn = Math.min(available, -net);
      reservoir = Math.max(0, reservoir - drawn);
      deficit = -net - drawn;
    }
    results.push({ month: m.month, precipitationMm: m.precipitationMm, etpMm: etp, reservoirStartMm: reservoirStart, reservoirEndMm: reservoir, surplusMm: surplus, deficitMm: deficit });
  }
  return results;
}

/** Jours nécessaires, à partir de la fin des pluies, pour épuiser le réservoir donné (Z, §5.2). */
export function daysToExhaustReserve(reservoirAtEndOfRainsMm: number, monthsAfter: MonthlyClimate[], etpByMonth: Map<number, number>): number {
  let remaining = reservoirAtEndOfRainsMm;
  let totalDays = 0;
  for (const m of monthsAfter) {
    const etp = etpByMonth.get(m.month) ?? 0;
    const days = DAYS_IN_MONTH[m.month - 1] ?? 30;
    const dailyDeficit = (etp - m.precipitationMm) / days;
    if (dailyDeficit <= 0) {
      // Ce mois ne consomme pas la réserve (P >= ETP) : arrêt de l'épuisement.
      break;
    }
    const daysToEmpty = remaining / dailyDeficit;
    if (daysToEmpty <= days) {
      totalDays += daysToEmpty;
      remaining = 0;
      break;
    } else {
      totalDays += days;
      remaining -= dailyDeficit * days;
    }
  }
  return totalDays;
}
