import { describe, expect, it } from 'vitest';
import { weightedSliceAverage, fixedDepthAverage, fixedDepthMax, horizonAtDepth } from '../../src/lib/soil/aggregation';
import { computeCecClay } from '../../src/lib/soil/cecClay';
import type { Horizon } from '../../src/lib/domain/types';

function horizon(code: string, topCm: number, bottomCm: number, overrides: Partial<Horizon> = {}): Horizon {
  return {
    code,
    topCm,
    bottomCm,
    sandPct: 30,
    siltPct: 30,
    clayPct: 40,
    phWater: 6,
    organicCarbonPct: 1,
    exchCa: 5,
    exchMg: 2,
    exchK: 0.5,
    exchNa: 0.2,
    cec: 10,
    ...overrides,
  };
}

describe('Pondération par tranches de 25cm (§4.1)', () => {
  it('applique les 4 facteurs 1,75-1,25-0,75-0,25 pour une culture annuelle en sol profond', () => {
    const profile = {
      effectiveDepthCm: 150,
      horizons: [horizon('H1', 0, 150, { clayPct: 20 })],
    };
    const result = weightedSliceAverage(profile, (h) => h.clayPct, 'annuelle', 50, 'Argile');
    // Toutes les tranches valent 20 → moyenne pondérée = 20 quels que soient les facteurs.
    expect(result.value).toBeCloseTo(20, 5);
  });

  it('utilise la table pérenne 125-150cm (6 tranches, facteurs 2-1,5-1-0,75-0,5-0,25) et pondère des horizons différents', () => {
    const profile = {
      effectiveDepthCm: 150,
      horizons: [
        horizon('H1', 0, 50, { clayPct: 10 }),
        horizon('H2', 50, 100, { clayPct: 20 }),
        horizon('H3', 100, 150, { clayPct: 30 }),
      ],
    };
    const result = weightedSliceAverage(profile, (h) => h.clayPct, 'perenne', 140, 'Argile');
    // Tranches (25cm) : H1,H1 (10,10) ; H2,H2 (20,20) ; H3,H3 (30,30)
    const facteurs = [2, 1.5, 1, 0.75, 0.5, 0.25];
    const valeurs = [10, 10, 20, 20, 30, 30];
    const expected = valeurs.reduce((s, v, i) => s + v * facteurs[i]!, 0) / 6;
    expect(result.value).toBeCloseTo(expected, 5);
  });
});

describe('Moyenne pondérée / maximum sur bande de profondeur fixe (§4.2)', () => {
  it('fixedDepthAverage pondère par épaisseur d\'horizon', () => {
    const horizons = [horizon('H1', 0, 10, { phWater: 5 }), horizon('H2', 10, 30, { phWater: 7 })];
    const result = fixedDepthAverage(horizons, (h) => h.phWater, 0, 30, 'pH');
    // 10cm à pH5, 20cm à pH7 → (10*5+20*7)/30 = 6.333
    expect(result.value).toBeCloseTo(6.333, 2);
  });

  it('fixedDepthMax retient le maximum sur la bande', () => {
    const horizons = [horizon('H1', 0, 50, { exchNa: 1, cec: 10 }), horizon('H2', 50, 100, { exchNa: 3, cec: 10 })];
    const result = fixedDepthMax(horizons, (h) => (h.exchNa / h.cec) * 100, 0, 100, 'ESP');
    expect(result.value).toBeCloseTo(30, 5);
  });
});

describe('CEC de l\'argile à 50cm (§4.2)', () => {
  it('CEC_argile = (CEC - 2*CO) * 100 / argile, sur l\'horizon couvrant 50cm', () => {
    const profile = {
      horizons: [horizon('H1', 0, 40, { cec: 5, organicCarbonPct: 1, clayPct: 30 }), horizon('H2', 40, 100, { cec: 15, organicCarbonPct: 0.5, clayPct: 45 })],
    };
    const result = computeCecClay(profile);
    expect(result.horizonUsed).toBe('H2');
    expect(result.value).toBeCloseTo(((15 - 2 * 0.5) * 100) / 45, 5);
  });
});

describe('horizonAtDepth', () => {
  it('retourne l\'horizon dont la fourchette couvre la profondeur donnée', () => {
    const horizons = [horizon('H1', 0, 20), horizon('H2', 20, 60)];
    expect(horizonAtDepth(horizons, 30)?.code).toBe('H2');
    expect(horizonAtDepth(horizons, 10)?.code).toBe('H1');
  });
});
