import type { CriterionRating, CriterionRequirement } from '../domain/types';
import { rateNumericCriterion, rateOrdinalCriterion } from './interpolation';
import { isNumericBounds, isOrdinalBounds, isSlopeScaleBounds, selectSlopeScale } from './boundsShape';

export interface RateCriterionResult {
  rating: CriterionRating | null;
  /** Motif de non-évaluation quand `rating` est `null` (§ règles du paquet de référence). */
  skipReason: string | null;
}

/**
 * Note un critère déjà résolu (valeur agrégée selon sa règle de profondeur, §4) contre les
 * exigences d'une culture. Retourne `rating: null` avec un motif explicite quand le critère
 * n'est pas évaluable — jamais une valeur par défaut, jamais une classe devinée.
 */
export function rateCriterion(
  requirement: CriterionRequirement,
  resolvedValue: number | string | null,
  depthTrace: string[],
  slopeScale: 1 | 2 | 3 = 3
): RateCriterionResult {
  if (requirement.kind === 'special_sys_cec') {
    return { rating: null, skipReason: requirement.note ?? 'Notation Sys « (-) / (+) » non confirmée — critère non évaluable' };
  }
  if (requirement.bounds === null) {
    return { rating: null, skipReason: requirement.note ?? 'Aucune donnée de référence lisible pour ce critère' };
  }
  if (resolvedValue === null) {
    return { rating: null, skipReason: 'Valeur non calculable à partir des données saisies' };
  }

  let bounds = requirement.bounds;
  if (isSlopeScaleBounds(bounds)) {
    bounds = selectSlopeScale(bounds, slopeScale);
    depthTrace = [...depthTrace, `Échelle de pente ${slopeScale} (site)`];
  }

  const base = {
    criterionCode: requirement.code,
    label: requirement.label,
    category: requirement.category,
    climateGroup: requirement.climateGroup,
    valeurRetenue: resolvedValue,
    unit: requirement.unit,
    depthRule: requirement.depthRule ?? ('surface' as const),
    corrigible: requirement.correctable,
    source: requirement.source,
    confidence: requirement.confidence,
    note: requirement.note,
  };

  if (requirement.kind === 'ordinal') {
    if (!isOrdinalBounds(bounds)) {
      return { rating: null, skipReason: 'Forme de bornes non reconnue pour un critère ordinal' };
    }
    const result = rateOrdinalCriterion(resolvedValue as string, bounds);
    if (!result) {
      return { rating: null, skipReason: `Valeur "${resolvedValue}" absente des classes définies pour ce critère (paquet de référence incomplet)` };
    }
    return {
      rating: {
        ...base,
        classe: result.classe,
        degre: result.degre,
        valeurParametrique: result.valeurParametrique,
        trace: [...depthTrace, ...result.trace],
      },
      skipReason: null,
    };
  }

  if (!isNumericBounds(bounds)) {
    return { rating: null, skipReason: 'Forme de bornes non reconnue pour un critère numérique' };
  }
  const result = rateNumericCriterion(resolvedValue as number, { bounds, kind: requirement.kind, label: requirement.label });
  return {
    rating: {
      ...base,
      classe: result.classe,
      degre: result.degre,
      valeurParametrique: result.valeurParametrique,
      trace: [...depthTrace, ...result.trace],
    },
    skipReason: null,
  };
}
