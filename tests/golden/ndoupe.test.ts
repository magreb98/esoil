/**
 * Ndoupe, palmier, climat et sol (§11.2, README du paquet de données de référence) : les 6
 * valeurs de non-régression données explicitement, vérifiées contre les bornes réelles du
 * palmier à huile transcrites dans src/config/reference/crops/oil-palm.json.
 */
import { describe, expect, it } from 'vitest';
import { rateNumericCriterion } from '../../src/lib/rating/interpolation';
import oilPalm from '../../src/config/reference/crops/oil-palm.json';
import type { CriterionRequirement, NumericBounds } from '../../src/lib/domain/types';

function requirement(code: string): { bounds: NumericBounds; kind: 'numerique_croissant' | 'numerique_decroissant' | 'numerique_optimum'; label: string } {
  const req = [...oilPalm.climateRequirements, ...oilPalm.soilRequirements].find((r) => r.code === code) as unknown as CriterionRequirement | undefined;
  if (!req) throw new Error(`Critère ${code} introuvable`);
  return req as { bounds: NumericBounds; kind: 'numerique_croissant' | 'numerique_decroissant' | 'numerique_optimum'; label: string };
}

describe('Ndoupe, palmier à huile — notation des critères (§11.2)', () => {
  it('mois secs = 3 (frontière S2/S3) → valeur paramétrique 60 (classe inférieure retenue)', () => {
    const result = rateNumericCriterion(3, requirement('mois_secs'));
    expect(result.classe).toBe('S3');
    expect(result.valeurParametrique).toBeCloseTo(60, 2);
  });

  it('précipitations 1890,93mm → interpolation 91,36 (S1-1 [1700,2000])', () => {
    const result = rateNumericCriterion(1890.93, requirement('precip_annuelle'));
    expect(result.classe).toBe('S1-1');
    expect(result.valeurParametrique).toBeCloseTo(91.36, 1);
  });

  it('température minimale absolue 18,11°C → interpolation 85,55 (S1-1 [18,20])', () => {
    const result = rateNumericCriterion(18.11, requirement('t_min_abs_mois_froid'));
    expect(result.classe).toBe('S1-1');
    expect(result.valeurParametrique).toBeCloseTo(85.55, 1);
  });

  it('n/N = 0,49 → interpolation 86,33 (S1-1 [0.45,0.75])', () => {
    const result = rateNumericCriterion(0.49, requirement('n_sur_N'));
    expect(result.classe).toBe('S1-1');
    expect(result.valeurParametrique).toBeCloseTo(86.33, 1);
  });

  it('pH = 4,7 → interpolation 70 (critère à optimum, côté bas de S2 [4.5,5.0])', () => {
    const result = rateNumericCriterion(4.7, requirement('ph'));
    expect(result.classe).toBe('S2');
    expect(result.valeurParametrique).toBeCloseTo(70, 1);
  });

  it('saturation en bases = 28,94% → interpolation 90,96 (S1-1 [20,35])', () => {
    const result = rateNumericCriterion(28.94, requirement('saturation_bases'));
    expect(result.classe).toBe('S1-1');
    expect(result.valeurParametrique).toBeCloseTo(90.96, 1);
  });
});
