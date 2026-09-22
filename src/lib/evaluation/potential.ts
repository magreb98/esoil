/**
 * Aptitude potentielle (§8.1) : limitations corrigibles levées selon les mesures choisies
 * par l'utilisateur dans le simulateur de scénarios. Climat et profondeur restent non
 * corrigibles par défaut (method.json → potentialCorrections [À CONFIRMER]).
 */
import type { CriterionRating, LimitationCategory, LimitationDegree } from '../domain/types';
import methodConfig from '../../config/method.json';

export interface PotentialScenario {
  correctedCategories: LimitationCategory[];
}

const RATING_SCALE = methodConfig.ratingScale;

/** Relève les critères des catégories sélectionnées, s'ils sont corrigibles, à la meilleure classe (S1-0). */
export function applyPotentialCorrections(ratings: CriterionRating[], scenario: PotentialScenario): CriterionRating[] {
  const correctable = new Set(methodConfig.potentialCorrections.correctableCategories as LimitationCategory[]);
  return ratings.map((r) => {
    const isSelected = scenario.correctedCategories.includes(r.category);
    const isCorrectableCategory = correctable.has(r.category);
    if (isSelected && r.corrigible && isCorrectableCategory) {
      const best = RATING_SCALE['S1-0'];
      return {
        ...r,
        classe: 'S1-0',
        degre: best.degre as LimitationDegree,
        valeurParametrique: best.valeurParametriqueMax,
        trace: [...r.trace, `Correction appliquée (${r.category}) — relevé à S1-0 (§8.1, scénario utilisateur)`],
      };
    }
    return r;
  });
}

export const DEFAULT_POTENTIAL_SCENARIO: PotentialScenario = {
  correctedCategories: methodConfig.potentialCorrections.correctableCategories as LimitationCategory[],
};
