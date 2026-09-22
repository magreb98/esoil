/**
 * Période de croissance (§5.2, annexe II du manuel + chapitre 2 du mémoire).
 * Interpolation au jour près (jours comptés après le 15 du mois 1) : formules transcrites
 * exactement depuis le prompt v2. NB : aucune valeur de référence chiffrée n'a été fournie
 * pour cette sous-étape (contrairement à l'exemple Umbelúzi qui utilise des valeurs déjà
 * notées) — implémentation de bonne foi d'après les formules, non validée par un golden test.
 */
import type { MonthlyClimate } from '../domain/types';
import { simulateWaterBalance, daysToExhaustReserve } from './waterBalance';

const DORMANCY_THRESHOLD_C = 6.5;
const MERGE_DEFICIT_THRESHOLD_MM = 50;

export interface GrowingPeriodSegment {
  startMonth: number;
  startDayOffsetFromMid: number; // jours après le 15 du mois de référence (formule X)
  endOfRainsMonth: number;
  endOfRainsDayOffsetFromMid: number; // formule Y
  reserveDepletionDaysZ: number;
  totalDurationDays: number;
  dryMonthsCount: number;
}

export interface GrowingPeriodResult {
  segments: GrowingPeriodSegment[];
  dryMonthsPerYear: number; // P < ½ETP
  dormantMonths: number[]; // température moyenne < 6.5°C
  merged: boolean;
}

function monthAt(months: MonthlyClimate[], m: number): MonthlyClimate {
  const wrapped = ((m - 1) % 12 + 12) % 12 + 1;
  return months.find((x) => x.month === wrapped)!;
}

/** X = 30 × (½ETP1 − P1) / ((P2 − P1) + ½(ETP1 − ETP2)) */
function startOffset(p1: number, etp1: number, p2: number, etp2: number): number {
  const denom = p2 - p1 + 0.5 * (etp1 - etp2);
  if (denom === 0) return 15;
  return (30 * (0.5 * etp1 - p1)) / denom;
}

/** Y = 30 × (P1 − ½ETP1) / ((P1 − P2) + ½(ETP2 − ETP1)) */
function endOfRainsOffset(p1: number, etp1: number, p2: number, etp2: number): number {
  const denom = p1 - p2 + 0.5 * (etp2 - etp1);
  if (denom === 0) return 15;
  return (30 * (p1 - 0.5 * etp1)) / denom;
}

export function computeGrowingPeriod(months: MonthlyClimate[], etpByMonth: Map<number, number>, reserveMaxMm: number): GrowingPeriodResult {
  const growing = months.map((m) => {
    const etp = etpByMonth.get(m.month) ?? 0;
    return { month: m.month, p: m.precipitationMm, etp, isGrowing: m.precipitationMm > etp / 2, isDry: m.precipitationMm < etp / 2 };
  });

  const dormantMonths = months.filter((m) => m.tMeanC < DORMANCY_THRESHOLD_C).map((m) => m.month);
  const dryMonthsPerYear = growing.filter((g) => g.isDry).length;

  // Identifie les segments circulaires de mois "croissance" (P > ½ETP)
  const n = 12;
  const flags = growing.sort((a, b) => a.month - b.month).map((g) => g.isGrowing);
  const segmentsRaw: Array<{ startIdx: number; endIdx: number }> = [];
  let i = 0;
  const visited = new Array(n).fill(false);
  while (i < n && !visited[i]) {
    if (flags[i]) {
      let start = i;
      let end = i;
      while (flags[(end + 1) % n] && !visited[(end + 1) % n]) {
        visited[end] = true;
        end = (end + 1) % n;
        if (end === start) break;
      }
      visited[end] = true;
      segmentsRaw.push({ startIdx: start, endIdx: end });
      i = end + 1;
    } else {
      i++;
    }
  }

  const segments: GrowingPeriodSegment[] = segmentsRaw.map(({ startIdx, endIdx }) => {
    const startMonth = startIdx + 1;
    const endMonth = endIdx + 1;
    const before = monthAt(months, startMonth - 1);
    const start = monthAt(months, startMonth);
    const after = monthAt(months, endMonth + 1);
    const end = monthAt(months, endMonth);

    const etpBefore = etpByMonth.get(before.month) ?? 0;
    const etpStart = etpByMonth.get(start.month) ?? 0;
    const etpEnd = etpByMonth.get(end.month) ?? 0;
    const etpAfter = etpByMonth.get(after.month) ?? 0;

    const xOffset = startOffset(before.precipitationMm, etpBefore, start.precipitationMm, etpStart);
    const yOffset = endOfRainsOffset(end.precipitationMm, etpEnd, after.precipitationMm, etpAfter);

    const wb = simulateWaterBalance(months, etpByMonth, reserveMaxMm, startMonth);
    const endEntry = wb.find((w) => w.month === end.month);
    const reservoirAtEndOfRains = endEntry ? endEntry.reservoirEndMm : reserveMaxMm;

    const afterMonths: MonthlyClimate[] = [];
    for (let k = 1; k <= 6; k++) afterMonths.push(monthAt(months, endMonth + k));
    const z = daysToExhaustReserve(reservoirAtEndOfRains, afterMonths, etpByMonth);

    const dryCount = ((endIdx - startIdx + n) % n) + 1;
    const totalDurationDays = (endMonth - startMonth + n) % n * 30 + (yOffset - xOffset) + z;

    return {
      startMonth,
      startDayOffsetFromMid: xOffset,
      endOfRainsMonth: end.month,
      endOfRainsDayOffsetFromMid: yOffset,
      reserveDepletionDaysZ: z,
      totalDurationDays: Math.max(0, totalDurationDays),
      dryMonthsCount: n - dryCount,
    };
  });

  // Fusion si le déficit cumulé entre deux segments < 50mm (§5.2)
  let merged = false;
  const finalSegments: GrowingPeriodSegment[] = [];
  for (const seg of segments) {
    const prev = finalSegments[finalSegments.length - 1];
    if (prev) {
      const gapMonths: MonthlyClimate[] = [];
      let m = prev.endOfRainsMonth + 1;
      while (m % 12 !== seg.startMonth % 12 && gapMonths.length < 11) {
        gapMonths.push(monthAt(months, m));
        m++;
      }
      const gapDeficit = gapMonths.reduce((s, gm) => s + Math.max(0, (etpByMonth.get(gm.month) ?? 0) - gm.precipitationMm), 0);
      if (gapDeficit < MERGE_DEFICIT_THRESHOLD_MM) {
        prev.endOfRainsMonth = seg.endOfRainsMonth;
        prev.endOfRainsDayOffsetFromMid = seg.endOfRainsDayOffsetFromMid;
        prev.reserveDepletionDaysZ = seg.reserveDepletionDaysZ;
        prev.totalDurationDays += seg.totalDurationDays;
        merged = true;
        continue;
      }
    }
    finalSegments.push({ ...seg });
  }

  return { segments: finalSegments, dryMonthsPerYear, dormantMonths, merged };
}
