import { describe, expect, it } from 'vitest';
import { rateCriterion } from '../../src/lib/rating/rateCriterion';
import { selectSlopeScale, isSlopeScaleBounds } from '../../src/lib/rating/boundsShape';
import type { CriterionRequirement, SlopeScaleBounds } from '../../src/lib/domain/types';

function baseRequirement(overrides: Partial<CriterionRequirement>): CriterionRequirement {
  return {
    code: 'test',
    label: 'Test',
    category: 's',
    kind: 'numerique_croissant',
    bounds: { 'S1-0': [[10, null]], S2: [[0, 10]] },
    correctable: false,
    source: 'Test',
    confidence: 'haute',
    ...overrides,
  };
}

describe('rateCriterion — critères non évaluables (règles du paquet de référence)', () => {
  it('bounds: null → non évaluable, jamais une valeur par défaut', () => {
    const req = baseRequirement({ bounds: null, note: 'Lecture impossible' });
    const { rating, skipReason } = rateCriterion(req, 5, []);
    expect(rating).toBeNull();
    expect(skipReason).toBe('Lecture impossible');
  });

  it("kind special_sys_cec → toujours non évaluable, même avec une valeur résolue", () => {
    const req = baseRequirement({ kind: 'special_sys_cec', bounds: { 'S1-0': ['> 16'] } });
    const { rating, skipReason } = rateCriterion(req, 20, []);
    expect(rating).toBeNull();
    expect(skipReason).toMatch(/Sys/);
  });

  it('valeur non résolue (null) → non évaluable', () => {
    const req = baseRequirement({});
    const { rating, skipReason } = rateCriterion(req, null, []);
    expect(rating).toBeNull();
    expect(skipReason).toMatch(/non calculable/);
  });

  it('critère normal résolu → noté normalement', () => {
    const req = baseRequirement({});
    const { rating } = rateCriterion(req, 15, []);
    expect(rating).not.toBeNull();
    expect(rating!.classe).toBe('S1-0');
  });

  it("valeur ordinale absente de toutes les classes → non évaluable, jamais une exception (cas réel : texture \"CL\" absente des bornes de l'ananas)", () => {
    const req = baseRequirement({ kind: 'ordinal', bounds: { 'S1-0': ['L', 'SCL'], S3: ['C<60v', 'C>60s'] } });
    expect(() => rateCriterion(req, 'CL', [])).not.toThrow();
    const { rating, skipReason } = rateCriterion(req, 'CL', []);
    expect(rating).toBeNull();
    expect(skipReason).toMatch(/absente des classes/);
  });
});

describe('Pente — sélection de l\'échelle (manuel §3)', () => {
  const slopeBounds: SlopeScaleBounds = {
    echelle_1: { 'S1-0': [[0, 1]], N2: [[1, null]] },
    echelle_3: { 'S1-0': [[0, 4]], N2: [[4, null]] },
  };

  it('isSlopeScaleBounds reconnaît la forme à échelles', () => {
    expect(isSlopeScaleBounds(slopeBounds)).toBe(true);
    expect(isSlopeScaleBounds({ 'S1-0': [[0, 1]] })).toBe(false);
  });

  it('selectSlopeScale choisit la bonne table', () => {
    expect(selectSlopeScale(slopeBounds, 1)).toBe(slopeBounds.echelle_1);
    expect(selectSlopeScale(slopeBounds, 3)).toBe(slopeBounds.echelle_3);
  });

  it("rateCriterion applique l'échelle du site à un critère pente", () => {
    const req = baseRequirement({ code: 'pente', kind: 'numerique_decroissant', bounds: slopeBounds });
    const scale1 = rateCriterion(req, 2, [], 1); // échelle 1 : 2% dépasse [0,1] → hors plage, rattaché à N2
    const scale3 = rateCriterion(req, 2, [], 3); // échelle 3 : 2% est dans [0,4] → S1-0
    expect(scale1.rating!.classe).toBe('N2');
    expect(scale3.rating!.classe).toBe('S1-0');
  });
});
