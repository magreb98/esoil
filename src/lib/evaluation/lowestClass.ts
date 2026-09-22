/** Méthode de la plus basse classe (§7.1, manuel p.24). */
import type { CriterionRating, LimitationCategory, LowestClassResult, SuitabilityClass } from '../domain/types';
import { LIMITATION_CATEGORIES } from '../domain/types';
import { worseClass } from '../rating/interpolation';

export function computeLowestClass(ratings: CriterionRating[]): LowestClassResult {
  const parCategorie: Record<LimitationCategory, SuitabilityClass | null> = {
    c: null,
    t: null,
    w: null,
    s: null,
    f: null,
    n: null,
  };

  for (const cat of LIMITATION_CATEGORIES) {
    const inCat = ratings.filter((r) => r.category === cat);
    if (inCat.length === 0) continue;
    parCategorie[cat] = inCat.reduce<SuitabilityClass>((worst, r) => worseClass(worst, r.classe), inCat[0]!.classe);
  }

  const defined = LIMITATION_CATEGORIES.filter((c) => parCategorie[c] !== null);
  if (defined.length === 0) {
    return { method: 'plus_basse_classe', classe: 'N2', limitingCategories: [], parCategorie };
  }
  const classe = defined.reduce<SuitabilityClass>((worst, c) => worseClass(worst, parCategorie[c]!), parCategorie[defined[0]!]!);
  const limitingCategories = defined.filter((c) => parCategorie[c] === classe);

  return { method: 'plus_basse_classe', classe, limitingCategories, parCategorie };
}
