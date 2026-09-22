/**
 * Interpolation par décades — vérifiée contre le tableau complet d'Umbelúzi
 * (method-formulas.md §1 du paquet de données de référence, manuel p.34).
 * Mois : novembre 71mm, décembre 79mm, janvier 127mm, février 119mm, mars 69mm, avril 60mm.
 */
import { describe, expect, it } from 'vitest';
import { interpolateDecadesAdditive } from '../../src/lib/climate/decades';

describe('Interpolation par décades — précipitations Umbelúzi (grandeur additive, /81)', () => {
  it('décembre (nov=71, déc=79, jan=127) → 23,5 / 25,8 / 29,7, total 79,0', () => {
    const d = interpolateDecadesAdditive(71, 79, 127);
    expect(d.d1).toBeCloseTo(23.5, 1);
    expect(d.d2).toBeCloseTo(25.8, 1);
    expect(d.d3).toBeCloseTo(29.7, 1);
    expect(d.d1 + d.d2 + d.d3).toBeCloseTo(79.0, 1); // contrôle D1+D2+D3 = M2
  });

  it('janvier (déc=79, jan=127, fév=119) → 39,8 / 43,0 / 44,2', () => {
    const d = interpolateDecadesAdditive(79, 127, 119);
    expect(d.d1).toBeCloseTo(39.8, 1);
    expect(d.d2).toBeCloseTo(43.0, 1);
    expect(d.d3).toBeCloseTo(44.2, 1);
    expect(d.d1 + d.d2 + d.d3).toBeCloseTo(127.0, 1);
  });

  it('février (jan=127, fév=119, mars=69) → 42,6 / 40,2 / 36,2', () => {
    const d = interpolateDecadesAdditive(127, 119, 69);
    expect(d.d1).toBeCloseTo(42.6, 1);
    expect(d.d2).toBeCloseTo(40.2, 1);
    expect(d.d3).toBeCloseTo(36.2, 1);
    expect(d.d1 + d.d2 + d.d3).toBeCloseTo(119.0, 1);
  });

  it('mars (fév=119, mars=69, avr=60) → 26,5 / 22,5 / 20,0', () => {
    const d = interpolateDecadesAdditive(119, 69, 60);
    expect(d.d1).toBeCloseTo(26.5, 1);
    expect(d.d2).toBeCloseTo(22.5, 1);
    expect(d.d3).toBeCloseTo(20.0, 1);
    expect(d.d1 + d.d2 + d.d3).toBeCloseTo(69.0, 1);
  });
});
