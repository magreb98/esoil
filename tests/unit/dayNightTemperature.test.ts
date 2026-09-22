/**
 * Températures diurne et nocturne (method-formulas.md §2). Le signe par défaut (« − ») est
 * vérifié physiquement cohérent (Tjour ≥ Tmoy ≥ Tnuit) ; le signe imprimé sur le scan (« + »)
 * est démontré incohérent pour documenter pourquoi il n'est pas retenu par défaut.
 */
import { describe, expect, it } from 'vitest';
import { computeDayNightTemperature } from '../../src/lib/climate/dayNightTemperature';

describe('Tjour / Tnuit (manuel p.34)', () => {
  it('signe par défaut (-) : Tjour ≥ Tmoyenne ≥ Tnuit', () => {
    const result = computeDayNightTemperature(30, 20, 12);
    expect(result.signeUtilise).toBe('-');
    expect(result.tJour).toBeGreaterThanOrEqual(result.tMoyenne);
    expect(result.tMoyenne).toBeGreaterThanOrEqual(result.tNuit);
  });

  it('reste cohérent (Tjour ≥ Tmoy ≥ Tnuit) sur plusieurs latitudes/amplitudes', () => {
    for (const [tMax, tMin, n] of [
      [32, 18, 11.5],
      [28, 22, 12.5],
      [35, 15, 13],
    ] as const) {
      const result = computeDayNightTemperature(tMax, tMin, n);
      expect(result.tJour).toBeGreaterThanOrEqual(result.tMoyenne);
      expect(result.tMoyenne).toBeGreaterThanOrEqual(result.tNuit);
    }
  });

  it('signe « + » (littéral du scan) casse la cohérence physique — documente pourquoi il n\'est pas le défaut', () => {
    const result = computeDayNightTemperature(30, 20, 12, '+');
    expect(result.tNuit).toBeGreaterThan(result.tMoyenne); // nuit plus chaude que la moyenne : incohérent
  });
});
