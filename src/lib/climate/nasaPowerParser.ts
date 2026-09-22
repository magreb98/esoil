/**
 * Import CSV NASA POWER — Monthly Timeseries (§2, fonction réseau optionnelle, dégradation
 * hors ligne propre). Suppose la mise en page `PARAMETER,YEAR,JAN..DEC` : jamais testé sur
 * un fichier réel [À CONFIRMER, cf. mémoire].
 */
import type { MonthlyClimate } from '../domain/types';

const MONTH_COLUMNS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const PARAMETER_ALIASES: Record<string, keyof MonthlyClimate> = {
  PRECTOT: 'precipitationMm',
  PRECTOTCORR: 'precipitationMm',
  T2M: 'tMeanC',
  T2M_MAX: 'tMaxC',
  T2M_MIN: 'tMinC',
  RH2M: 'relativeHumidityPct',
};

export interface NasaPowerParseResult {
  months: MonthlyClimate[];
  warnings: string[];
}

function findHeaderRow(lines: string[]): { index: number; columns: string[] } | null {
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i]!.split(',').map((c) => c.trim().toUpperCase());
    if (cols[0] === 'PARAMETER' && cols[1] === 'YEAR' && MONTH_COLUMNS.every((m) => cols.includes(m))) {
      return { index: i, columns: cols };
    }
  }
  return null;
}

export function parseNasaPowerCsv(csvText: string): NasaPowerParseResult {
  const warnings: string[] = [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = findHeaderRow(lines);
  if (!header) {
    return { months: [], warnings: ["En-tête PARAMETER,YEAR,JAN..DEC introuvable — format non reconnu [À CONFIRMER]"] };
  }

  const monthIdx = MONTH_COLUMNS.map((m) => header.columns.indexOf(m));
  const paramIdx = header.columns.indexOf('PARAMETER');
  const values: Partial<Record<keyof MonthlyClimate, number[]>> = {};

  for (let i = header.index + 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',').map((c) => c.trim());
    const paramRaw = cols[paramIdx]?.toUpperCase();
    if (!paramRaw) continue;
    const field = PARAMETER_ALIASES[paramRaw];
    if (!field) continue;

    const monthly = monthIdx.map((idx) => (idx >= 0 ? parseFloat(cols[idx] ?? '') : NaN));
    // Si plusieurs années sont présentes, on moyenne (climatologie mensuelle multi-année).
    if (!values[field]) values[field] = new Array(12).fill(0).map(() => 0);
    const arr = values[field]!;
    const countKey = `${field}__count`;
    void countKey;
    for (let m = 0; m < 12; m++) {
      if (!Number.isNaN(monthly[m])) arr[m] = (arr[m] ?? 0) + monthly[m]!;
    }
  }

  // Compte le nombre de lignes de données par paramètre pour moyenner correctement
  const rowCounts: Record<string, number> = {};
  for (let i = header.index + 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',').map((c) => c.trim());
    const paramRaw = cols[paramIdx]?.toUpperCase();
    if (paramRaw && PARAMETER_ALIASES[paramRaw]) {
      rowCounts[paramRaw] = (rowCounts[paramRaw] ?? 0) + 1;
    }
  }

  const months: MonthlyClimate[] = [];
  for (let m = 0; m < 12; m++) {
    const precip = values.precipitationMm?.[m];
    const tMean = values.tMeanC?.[m];
    const tMax = values.tMaxC?.[m];
    const tMin = values.tMinC?.[m];
    const rh = values.relativeHumidityPct?.[m];
    const precCount = rowCounts.PRECTOTCORR ?? rowCounts.PRECTOT ?? 1;
    const tCount = rowCounts.T2M ?? 1;
    const tMaxCount = rowCounts.T2M_MAX ?? 1;
    const tMinCount = rowCounts.T2M_MIN ?? 1;
    const rhCount = rowCounts.RH2M ?? 1;

    if (tMean === undefined || tMax === undefined || tMin === undefined || precip === undefined) {
      warnings.push(`Mois ${m + 1} : données incomplètes dans le fichier`);
    }

    months.push({
      month: m + 1,
      precipitationMm: (precip ?? 0) / precCount,
      tMeanC: (tMean ?? 0) / tCount,
      tMaxC: (tMax ?? 0) / tMaxCount,
      tMinC: (tMin ?? 0) / tMinCount,
      relativeHumidityPct: rh !== undefined ? rh / rhCount : undefined,
    });
  }

  if (Object.keys(rowCounts).length === 0) {
    warnings.push('Aucun paramètre reconnu (PRECTOT/PRECTOTCORR, T2M, T2M_MAX, T2M_MIN, RH2M attendus)');
  }

  return { months, warnings };
}
