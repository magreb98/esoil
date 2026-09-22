/**
 * Notation d'un critère : classe + valeur paramétrique (§6, manuel p.26).
 * Bornes au format du paquet de données de référence : `[min, max]`, `null` = borne ouverte.
 */
import type { NumericBounds, OrdinalBounds, ReferenceInterval, SuitabilityClass } from '../domain/types';
import methodConfig from '../../config/method.json';

const CLASS_ORDER: SuitabilityClass[] = ['S1-0', 'S1-1', 'S2', 'S3', 'N1', 'N2'];

export function classRank(c: SuitabilityClass): number {
  return CLASS_ORDER.indexOf(c);
}

export function worseClass(a: SuitabilityClass, b: SuitabilityClass): SuitabilityClass {
  return classRank(a) >= classRank(b) ? a : b;
}

interface RatingScaleEntry {
  valeurParametriqueMin: number;
  valeurParametriqueMax: number;
  degre: 0 | 1 | 2 | 3 | 4;
}

const RATING_SCALE = methodConfig.ratingScale as Record<SuitabilityClass, RatingScaleEntry>;

export interface NumericRatingResult {
  classe: SuitabilityClass;
  valeurParametrique: number;
  degre: 0 | 1 | 2 | 3 | 4;
  trace: string[];
}

function inRange(value: number, [lo, hi]: ReferenceInterval): boolean {
  return (lo === null || value >= lo) && (hi === null || value <= hi);
}

function formatBound(v: number | null): string {
  return v === null ? '∞' : String(v);
}

function findOptimumCenter(bounds: NumericBounds): number {
  const best = bounds['S1-0'];
  if (!best || best.length === 0) return 0;
  const finite = best.filter(([lo, hi]) => lo !== null && hi !== null) as Array<[number, number]>;
  if (finite.length === 0) return 0;
  const mids = finite.map(([lo, hi]) => (lo + hi) / 2);
  return mids.reduce((s, v) => s + v, 0) / mids.length;
}

/** t=0 au bord « pire » de la classe, t=1 au bord « meilleur ». Un bord ouvert (null) est traité comme le bord pire ou meilleur selon `betterBound`, faute de repère au-delà (§6). */
function computeT(value: number, [lo, hi]: ReferenceInterval, betterBound: 'lo' | 'hi'): number {
  const betterIsNull = betterBound === 'hi' ? hi === null : lo === null;
  const worseIsNull = betterBound === 'hi' ? lo === null : hi === null;
  if (betterIsNull) return 1;
  if (worseIsNull) return 0;
  const lo_ = lo as number;
  const hi_ = hi as number;
  if (hi_ === lo_) return 1;
  return betterBound === 'hi' ? (value - lo_) / (hi_ - lo_) : (hi_ - value) / (hi_ - lo_);
}

export function rateNumericCriterion(
  value: number,
  requirement: { bounds: NumericBounds; kind: 'numerique_croissant' | 'numerique_decroissant' | 'numerique_optimum'; label: string }
): NumericRatingResult {
  const trace: string[] = [];
  const bounds = requirement.bounds;

  const candidates: Array<{ classe: SuitabilityClass; range: ReferenceInterval }> = [];
  for (const classe of CLASS_ORDER) {
    const ranges = bounds[classe];
    if (!ranges) continue;
    for (const range of ranges) {
      if (inRange(value, range)) candidates.push({ classe, range });
    }
  }

  let chosen: { classe: SuitabilityClass; range: ReferenceInterval };
  if (candidates.length === 0) {
    let best: { classe: SuitabilityClass; range: ReferenceInterval; dist: number } | null = null;
    for (const classe of CLASS_ORDER) {
      const ranges = bounds[classe];
      if (!ranges) continue;
      for (const range of ranges) {
        const [lo, hi] = range;
        const dist = lo !== null && value < lo ? lo - value : hi !== null && value > hi ? value - hi : Infinity;
        if (!best || dist < best.dist) best = { classe, range, dist };
      }
    }
    if (!best) throw new Error(`Aucune borne définie pour le critère "${requirement.label}"`);
    trace.push(`Valeur ${value} hors des plages définies — rattachée à la classe la plus proche (${best.classe})`);
    chosen = best;
  } else if (candidates.length === 1) {
    chosen = candidates[0]!;
  } else {
    // Valeur exactement sur une borne partagée par deux classes : règle §6 [À CONFIRMER] — classe inférieure (plus défavorable).
    chosen = candidates.reduce((worst, c) => (classRank(c.classe) >= classRank(worst.classe) ? c : worst));
    trace.push(`Valeur ${value} exactement sur une borne partagée : classe la plus défavorable retenue (${chosen.classe}) — règle §6 [À CONFIRMER]`);
  }

  const [lo, hi] = chosen.range;
  const scale = RATING_SCALE[chosen.classe];
  let t: number;

  if (requirement.kind === 'numerique_optimum') {
    const center = findOptimumCenter(bounds);
    const finiteLo = lo ?? -Infinity;
    const finiteHi = hi ?? Infinity;
    const rangeMid = (finiteLo + finiteHi) / 2;
    const isLowSide = rangeMid <= center;
    t = computeT(value, chosen.range, isLowSide ? 'hi' : 'lo');
    trace.push(`Critère à optimum, centre ≈ ${center.toFixed(2)}, côté ${isLowSide ? 'bas' : 'haut'}`);
  } else if (requirement.kind === 'numerique_decroissant') {
    t = computeT(value, chosen.range, 'lo');
  } else {
    t = computeT(value, chosen.range, 'hi');
  }
  t = Math.max(0, Math.min(1, t));

  const valeurParametrique = scale.valeurParametriqueMin + t * (scale.valeurParametriqueMax - scale.valeurParametriqueMin);
  trace.push(
    `Classe ${chosen.classe} [${formatBound(lo)}, ${formatBound(hi)}] ; t=${t.toFixed(3)} ; valeur paramétrique = ${scale.valeurParametriqueMin} + ${scale.valeurParametriqueMax - scale.valeurParametriqueMin} × ${t.toFixed(3)} = ${valeurParametrique.toFixed(2)}`
  );

  return { classe: chosen.classe, valeurParametrique, degre: scale.degre, trace };
}

export interface OrdinalRatingResult {
  classe: SuitabilityClass;
  valeurParametrique: number;
  degre: 0 | 1 | 2 | 3 | 4;
  trace: string[];
}

/**
 * Critère non numérique (drainage, inondation, texture) : valeur la plus haute de la classe.
 * `null` si la valeur n'apparaît dans aucune classe du critère — ex. une texture calculée qui
 * n'est listée pour aucune classe de cette culture dans le paquet de référence (cas réel :
 * l'ananas ne liste pas "CL"). Jamais une exception qui ferait planter toute l'évaluation :
 * le critère est simplement non évaluable, comme une donnée manquante (§ règles du paquet).
 */
export function rateOrdinalCriterion(value: string, bounds: OrdinalBounds): OrdinalRatingResult | null {
  for (const classe of CLASS_ORDER) {
    const values = bounds[classe];
    if (values && values.includes(value)) {
      const scale = RATING_SCALE[classe];
      return {
        classe,
        valeurParametrique: scale.valeurParametriqueMax,
        degre: scale.degre,
        trace: [`Valeur "${value}" → classe ${classe} → valeur paramétrique = borne haute (${scale.valeurParametriqueMax}), règle §6`],
      };
    }
  }
  return null;
}
