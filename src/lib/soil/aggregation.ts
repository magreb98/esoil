/**
 * Règles de profondeur du manuel (p.39-44, §4 du prompt v2). Une caractéristique n'est
 * jamais lue sur un seul horizon arbitraire : chaque paramètre a sa règle explicite.
 */
import type { Horizon, Profile } from '../domain/types';
import methodConfig from '../../config/method.json';

export interface SliceWeightingTable {
  tranches: number;
  facteurs: number[];
}

export interface AggregationResult {
  value: number;
  trace: string[];
}

/** Découpe [0, totalDepthCm) en tranches de `sliceCm` et donne la valeur de l'horizon qui recouvre chaque tranche (pro rata au milieu de tranche). */
function sliceValues(horizons: Horizon[], property: (h: Horizon) => number, sliceCm: number, nSlices: number): number[] {
  const sorted = [...horizons].sort((a, b) => a.topCm - b.topCm);
  const values: number[] = [];
  for (let i = 0; i < nSlices; i++) {
    const sliceTop = i * sliceCm;
    const sliceBottom = sliceTop + sliceCm;
    const sliceMid = (sliceTop + sliceBottom) / 2;
    let covering = sorted.find((h) => sliceMid >= h.topCm && sliceMid < h.bottomCm);
    if (!covering) {
      // Tranche au-delà du profil décrit : extrapoler le dernier horizon (§4.1, profilPlusCourtQueEnracinement)
      covering = sorted[sorted.length - 1];
    }
    values.push(covering ? property(covering) : 0);
  }
  return values;
}

function pickSliceTable(
  lifecycle: 'perenne' | 'annuelle' | 'semi-perenne',
  rootingDepthCm: number,
  effectiveDepthCm: number
): { table: SliceWeightingTable; scenario: string } {
  const cfg = methodConfig.depthSliceWeighting;
  if (lifecycle === 'perenne') {
    if (rootingDepthCm > 125) return { table: cfg.perenne.enracinement_125_150cm, scenario: 'Pérenne, enracinement 125-150cm' };
    if (rootingDepthCm > 100) return { table: cfg.perenne.enracinement_100_125cm, scenario: 'Pérenne, enracinement 100-125cm' };
    return { table: cfg.perenne.enracinement_0_100cm, scenario: 'Pérenne, enracinement 0-100cm' };
  }
  // Annuelle / semi-pérenne : dépend de la profondeur effective du sol
  if (effectiveDepthCm <= 25) return { table: cfg.annuelle_ou_sol_peu_profond.profondeur_0_25cm, scenario: 'Sol 0-25cm' };
  if (effectiveDepthCm <= 50) return { table: cfg.annuelle_ou_sol_peu_profond.profondeur_25_50cm, scenario: 'Sol 25-50cm' };
  if (effectiveDepthCm <= 75) return { table: cfg.annuelle_ou_sol_peu_profond.profondeur_50_75cm, scenario: 'Sol 50-75cm (proche de la table 75cm)' };
  return { table: cfg.annuelle_ou_sol_peu_profond.profondeur_superieure_100cm, scenario: 'Sol profond (>1m), 0-100cm' };
}

/**
 * Moyenne pondérée par tranches de 25cm (§4.1). Utilisée pour le % d'argile (texture
 * « améliorée ») et la saturation en bases (« upgraded base saturation »).
 */
export function weightedSliceAverage(
  profile: Pick<Profile, 'horizons' | 'effectiveDepthCm'>,
  property: (h: Horizon) => number,
  lifecycle: 'perenne' | 'annuelle' | 'semi-perenne',
  rootingDepthCm: number,
  propertyLabel: string
): AggregationResult {
  const { table, scenario } = pickSliceTable(lifecycle, rootingDepthCm, profile.effectiveDepthCm);
  const sliceCm = 25;
  const values = sliceValues(profile.horizons, property, sliceCm, table.tranches);
  const trace: string[] = [`${propertyLabel} — pondération par tranches de 25cm (${scenario})`];

  const profileDepth = Math.max(...profile.horizons.map((h) => h.bottomCm), 0);
  const neededDepth = table.tranches * sliceCm;
  if (profileDepth < neededDepth) {
    trace.push(
      `Profil décrit sur ${profileDepth}cm, insuffisant pour ${neededDepth}cm requis : dernier horizon extrapolé (§4.1 [À CONFIRMER])`
    );
  }

  let sum = 0;
  for (let i = 0; i < table.tranches; i++) {
    const v = values[i] ?? 0;
    const f = table.facteurs[i] ?? 0;
    sum += v * f;
    trace.push(`Tranche ${i + 1} (${i * sliceCm}-${(i + 1) * sliceCm}cm) : ${v.toFixed(2)} × ${f} = ${(v * f).toFixed(2)}`);
  }
  const value = sum / table.tranches;
  trace.push(`Valeur = Σ(valeur × facteur) / ${table.tranches} = ${value.toFixed(3)}`);
  return { value, trace };
}

/** Moyenne pondérée par épaisseur d'horizon sur une bande de profondeur fixe (§4.2). */
export function fixedDepthAverage(horizons: Horizon[], property: (h: Horizon) => number, fromCm: number, toCm: number, propertyLabel: string): AggregationResult {
  const trace: string[] = [`${propertyLabel} — moyenne pondérée ${fromCm}-${toCm}cm`];
  let weightedSum = 0;
  let totalThickness = 0;
  for (const h of horizons) {
    const overlapTop = Math.max(h.topCm, fromCm);
    const overlapBottom = Math.min(h.bottomCm, toCm);
    const thickness = Math.max(0, overlapBottom - overlapTop);
    if (thickness > 0) {
      weightedSum += property(h) * thickness;
      totalThickness += thickness;
      trace.push(`${h.code} (${overlapTop}-${overlapBottom}cm, ${thickness}cm) : ${property(h)}`);
    }
  }
  if (totalThickness === 0) {
    trace.push('Aucun horizon ne couvre cette bande de profondeur — valeur non calculable');
    return { value: NaN, trace };
  }
  const value = weightedSum / totalThickness;
  trace.push(`Moyenne pondérée = ${value.toFixed(3)}`);
  return { value, trace };
}

/** Maximum sur une bande de profondeur fixe (§4.2, ESP). */
export function fixedDepthMax(horizons: Horizon[], property: (h: Horizon) => number, fromCm: number, toCm: number, propertyLabel: string): AggregationResult {
  const trace: string[] = [`${propertyLabel} — maximum ${fromCm}-${toCm}cm`];
  let max = -Infinity;
  for (const h of horizons) {
    const overlapTop = Math.max(h.topCm, fromCm);
    const overlapBottom = Math.min(h.bottomCm, toCm);
    if (overlapBottom > overlapTop) {
      const v = property(h);
      trace.push(`${h.code} (${overlapTop}-${overlapBottom}cm) : ${v}`);
      if (v > max) max = v;
    }
  }
  if (max === -Infinity) {
    trace.push('Aucun horizon ne couvre cette bande de profondeur — valeur non calculable');
    return { value: NaN, trace };
  }
  trace.push(`Maximum = ${max}`);
  return { value: max, trace };
}

/** Horizon couvrant une profondeur donnée (ex. 50cm pour la CEC de l'argile, §4.2). */
export function horizonAtDepth(horizons: Horizon[], depthCm: number): Horizon | undefined {
  const sorted = [...horizons].sort((a, b) => a.topCm - b.topCm);
  const found = sorted.find((h) => depthCm >= h.topCm && depthCm < h.bottomCm);
  return found ?? sorted[sorted.length - 1];
}
