/** Notation finale complète (§7.4) : combine les trois méthodes, signale les désaccords. */
import type { FinalClass, LowestClassResult, NumberIntensityResult, ParametricResult } from '../domain/types';

const FINAL_CLASS_ORDER: FinalClass[] = ['S1-0', 'S1-0/1', 'S1-1', 'S1-1/S2', 'S2', 'S2/S3', 'S3', 'S3/N', 'N1', 'N2'];

function finalRank(c: FinalClass): number {
  const idx = FINAL_CLASS_ORDER.indexOf(c);
  return idx === -1 ? FINAL_CLASS_ORDER.length : idx;
}

export interface FinalNotationResult {
  finalNotation: string;
  methodsAgree: boolean;
  mostPrudentClass: FinalClass;
}

export function computeFinalNotation(
  lowest: LowestClassResult,
  numberIntensity: NumberIntensityResult,
  parametric: ParametricResult
): FinalNotationResult {
  const classes: FinalClass[] = [lowest.classe, numberIntensity.classe, parametric.classe];
  const mostPrudentClass = classes.reduce((worst, c) => (finalRank(c) > finalRank(worst) ? c : worst), classes[0]!);
  const methodsAgree = classes.every((c) => c === classes[0]);

  const categories = lowest.limitingCategories;
  // Convention manuel : une seule catégorie limitante accolée sans parenthèses (ex. S3f) ;
  // plusieurs catégories entre parenthèses et virgules (ex. S3/N(c,f), §7.4).
  const suffix = categories.length === 0 ? '' : categories.length === 1 ? categories[0] : `(${categories.join(',')})`;
  const finalNotation = `${mostPrudentClass}${suffix}`;

  return { finalNotation, methodsAgree, mostPrudentClass };
}
