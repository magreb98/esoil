import { describe, expect, it } from 'vitest';
import { rateNumericCriterion, rateOrdinalCriterion } from '../../src/lib/rating/interpolation';
import type { NumericBounds } from '../../src/lib/domain/types';

const phLikeCriterion: { bounds: NumericBounds; kind: 'numerique_optimum'; label: string } = {
  label: 'pH (synthétique)',
  kind: 'numerique_optimum',
  bounds: {
    'S1-0': [[6.5, 7.3]],
    'S1-1': [[6.0, 6.5], [7.3, 7.8]],
    S2: [[5.5, 6.0], [7.8, 8.3]],
    S3: [[5.0, 5.5], [8.3, 8.8]],
    N2: [[0, 5.0], [8.8, 14]],
  },
};

describe('Critère à optimum (pH synthétique, §6)', () => {
  it('côté bas : la valeur la plus proche de l\'optimum obtient la valeur paramétrique la plus haute de la classe', () => {
    const near = rateNumericCriterion(6.4, phLikeCriterion); // proche de 6.5 (optimum)
    const far = rateNumericCriterion(6.05, phLikeCriterion); // proche de 6.0 (loin de l'optimum)
    expect(near.classe).toBe('S1-1');
    expect(far.classe).toBe('S1-1');
    expect(near.valeurParametrique).toBeGreaterThan(far.valeurParametrique);
  });

  it('côté haut : symétrique — proche de l\'optimum côté basique', () => {
    const near = rateNumericCriterion(7.35, phLikeCriterion); // proche de 7.3 (optimum)
    const far = rateNumericCriterion(7.75, phLikeCriterion); // proche de 7.8 (loin)
    expect(near.valeurParametrique).toBeGreaterThan(far.valeurParametrique);
  });

  it('dans la plage S1-0 (optimum), valeur paramétrique proche du maximum', () => {
    const result = rateNumericCriterion(6.9, phLikeCriterion);
    expect(result.classe).toBe('S1-0');
    expect(result.valeurParametrique).toBeGreaterThanOrEqual(95);
  });
});

const growingIncreasingCriterion: { bounds: NumericBounds; kind: 'numerique_croissant'; label: string } = {
  label: 'Critère croissant synthétique',
  kind: 'numerique_croissant',
  bounds: {
    'S1-0': [[2000, null]],
    'S1-1': [[1700, 2000]],
    S2: [[1450, 1700]],
  },
};

describe('Intervalle ouvert (§6 [À CONFIRMER])', () => {
  it('valeur bien au-delà de la borne ouverte → valeur paramétrique haute de la classe', () => {
    const result = rateNumericCriterion(5000, growingIncreasingCriterion);
    expect(result.classe).toBe('S1-0');
    expect(result.valeurParametrique).toBeCloseTo(100, 5);
  });
});

describe('Bornes exactes — valeur sur une frontière partagée', () => {
  it('retient la classe la plus défavorable (§6 [À CONFIRMER])', () => {
    const result = rateNumericCriterion(1700, growingIncreasingCriterion);
    // 1700 est à la fois le haut de S2 et le bas de S1-1 : classe la plus défavorable = S2
    expect(result.classe).toBe('S2');
  });
});

describe('Critère ordinal (§6)', () => {
  it('retient la valeur la plus haute de la classe', () => {
    const bounds = { 'S1-0': ['bon'], 'S1-1': ['modere'], S2: ['imparfait'] };
    const result = rateOrdinalCriterion('modere', bounds);
    expect(result.classe).toBe('S1-1');
    expect(result.valeurParametrique).toBe(95);
  });
});
