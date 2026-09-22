/**
 * Interpolation par décades (manuel p.32, method-formulas.md §1 du paquet de données de
 * référence — fournie et vérifiée). Trois décades D1, D2, D3 du mois M2, à partir des mois
 * voisins M1 (précédent) et M3 (suivant).
 *
 * Grandeurs additives (précipitations, ETP, heures d'ensoleillement) : coefficients divisés
 * par 81. Grandeurs non additives (température, vent…) : mêmes coefficients divisés par 27.
 *
 * Vérifié : D1 de décembre à Umbelúzi (novembre 71mm, décembre 79mm, janvier 127mm)
 * = (5×71 + 26×79 − 4×127) / 81 = 1901 / 81 = 23,5mm.
 */

export interface DecadeInterpolation {
  d1: number;
  d2: number;
  d3: number;
}

function interpolate(m1: number, m2: number, m3: number, divisor: number): DecadeInterpolation {
  return {
    d1: (5 * m1 + 26 * m2 - 4 * m3) / divisor,
    d2: (-1 * m1 + 29 * m2 - 1 * m3) / divisor,
    d3: (-4 * m1 + 26 * m2 + 5 * m3) / divisor,
  };
}

/** Grandeur additive (précipitations, ETP, insolation en heures) : contrôle D1+D2+D3 = M2. */
export function interpolateDecadesAdditive(m1: number, m2: number, m3: number): DecadeInterpolation {
  return interpolate(m1, m2, m3, 81);
}

/** Grandeur non additive (température, vent…) : contrôle (D1+D2+D3)/3 = M2. */
export function interpolateDecadesNonAdditive(m1: number, m2: number, m3: number): DecadeInterpolation {
  return interpolate(m1, m2, m3, 27);
}
