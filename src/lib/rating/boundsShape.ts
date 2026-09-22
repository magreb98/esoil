/**
 * Reconnaissance de la forme de `bounds` à l'exécution (§ method-formulas.md du paquet de
 * données de référence). Trois formes possibles, ou `null` (non évaluable) — jamais devinée
 * silencieusement : une forme non reconnue lève une erreur explicite.
 */
import type { CriterionBounds, NumericBounds, OrdinalBounds, SlopeScaleBounds } from '../domain/types';

const SLOPE_SCALE_KEYS = ['echelle_1', 'echelle_2', 'echelle_3'];

export function isSlopeScaleBounds(bounds: CriterionBounds): bounds is SlopeScaleBounds {
  if (!bounds || typeof bounds !== 'object') return false;
  return Object.keys(bounds).some((k) => SLOPE_SCALE_KEYS.includes(k));
}

function firstValue(bounds: object): unknown {
  const key = Object.keys(bounds)[0];
  return key ? (bounds as Record<string, unknown>)[key] : undefined;
}

export function isOrdinalBounds(bounds: CriterionBounds): bounds is OrdinalBounds {
  if (!bounds || typeof bounds !== 'object') return false;
  const first = firstValue(bounds);
  return Array.isArray(first) && (first.length === 0 || typeof first[0] === 'string');
}

export function isNumericBounds(bounds: CriterionBounds): bounds is NumericBounds {
  if (!bounds || typeof bounds !== 'object') return false;
  const first = firstValue(bounds);
  return Array.isArray(first) && (first.length === 0 || Array.isArray(first[0]));
}

/** Sélectionne la table de bornes de l'échelle de pente active (site → `defaultSlopeScale`). */
export function selectSlopeScale(bounds: SlopeScaleBounds, scale: 1 | 2 | 3): NumericBounds {
  const key = (`echelle_${scale}` as const) satisfies keyof SlopeScaleBounds;
  const selected = bounds[key];
  if (!selected) {
    throw new Error(`Échelle de pente ${scale} absente des bornes du critère « pente »`);
  }
  return selected;
}
