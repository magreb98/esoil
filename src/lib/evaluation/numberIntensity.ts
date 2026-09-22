/** Méthode du nombre et de l'intensité des limitations (§7.2, manuel p.25). */
import type { CriterionRating, LimitationDegree, NumberIntensityResult, SuitabilityClass } from '../domain/types';
import { worseClass } from '../rating/interpolation';
import methodConfig from '../../config/method.json';

function emptyCounts(): Record<LimitationDegree, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
}

function countDegrees(ratings: CriterionRating[]): Record<LimitationDegree, number> {
  const counts = emptyCounts();
  for (const r of ratings) counts[r.degre]++;
  return counts;
}

/**
 * Classe issue des seuils configurables (method.json → numberIntensityThresholds, [À CONFIRMER]).
 * Vérifié sur l'exemple du manuel : 5 légères + 2 modérées + 3 sévères → S3 ; 3 légères + 2
 * modérées → S2.
 */
function classifyFromCounts(counts: Record<LimitationDegree, number>, allCriteria: CriterionRating[]): SuitabilityClass {
  const t = methodConfig.numberIntensityThresholds;
  const degre4 = allCriteria.filter((r) => r.degre === 4);

  if (counts[4] > 0) {
    const allCorrectable = degre4.every((r) => r.corrigible);
    return allCorrectable ? 'N1' : 'N2';
  }
  if (counts[3] >= t.s3_min_severes_degre3) return 'S3';
  if (counts[2] > t.s2_max_moderees_degre2) return 'S3';
  if (counts[2] >= 1) return 'S2';
  if (counts[1] > t.s1_1_max_legeres_degre1) return 'S2';
  if (counts[1] >= 1) return 'S1-1';
  return 'S1-0';
}

export function computeNumberIntensity(climateRatings: CriterionRating[], soilRatings: CriterionRating[]): NumberIntensityResult {
  const climatCounts = countDegrees(climateRatings);
  const solCounts = countDegrees(soilRatings);
  const classeClimat = classifyFromCounts(climatCounts, climateRatings);
  const classeSol = soilRatings.length > 0 ? classifyFromCounts(solCounts, soilRatings) : 'S1-0';

  return {
    method: 'nombre_intensite',
    classeClimat,
    classeSol,
    classe: worseClass(classeClimat, classeSol),
    counts: { climat: climatCounts, sol: solCounts },
  };
}
