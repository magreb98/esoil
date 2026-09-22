/**
 * Contrôles qualité à l'import (§10.1). Le cas GPS reproduit l'anomalie réelle de l'annexe 18
 * du mémoire GWETH (memoire_p97) : un sondage à 10°29' au lieu de 10°39' (minute mal
 * transcrite, ~18km d'écart) au sein d'un même layon dont tous les autres points sont à 10°39'.
 */
import { describe, expect, it } from 'vitest';
import {
  checkTextureSum,
  checkBaseSaturationConsistency,
  checkHorizonContinuity,
  checkGpsConsistencyWithSite,
  checkNitrogenUnitPlausibility,
} from '../../src/lib/quality/dataChecks';
import type { Horizon } from '../../src/lib/domain/types';

function horizon(overrides: Partial<Horizon> = {}): Horizon {
  return {
    code: 'H1',
    topCm: 0,
    bottomCm: 30,
    sandPct: 30,
    siltPct: 30,
    clayPct: 40,
    phWater: 6,
    organicCarbonPct: 1,
    exchCa: 5,
    exchMg: 2,
    exchK: 0.3,
    exchNa: 0.1,
    cec: 10,
    ...overrides,
  };
}

function dms(deg: number, min: number, sec: number): number {
  return deg + min / 60 + sec / 3600;
}

describe('Somme sable+limon+argile (§10.1)', () => {
  it("signale un écart > 1% à 100%", () => {
    const issue = checkTextureSum(horizon({ sandPct: 40, siltPct: 40, clayPct: 40 })); // 120%
    expect(issue?.severity).toBe('erreur');
  });
  it('accepte un arrondi dans la tolérance', () => {
    expect(checkTextureSum(horizon({ sandPct: 33, siltPct: 33, clayPct: 34.5 }))).toBeNull();
  });
});

describe('SBE ≤ CEC (§10.1)', () => {
  it('signale SBE > CEC', () => {
    const issue = checkBaseSaturationConsistency(horizon({ exchCa: 8, exchMg: 4, exchK: 1, exchNa: 1, cec: 10 })); // SBE=14>10
    expect(issue?.severity).toBe('erreur');
  });
});

describe('Horizons contigus (§10.1)', () => {
  it('détecte un trou', () => {
    const issues = checkHorizonContinuity([horizon({ code: 'H1', topCm: 0, bottomCm: 20 }), horizon({ code: 'H2', topCm: 30, bottomCm: 60 })]);
    expect(issues.some((i) => i.message.includes('Trou'))).toBe(true);
  });
  it('détecte un chevauchement', () => {
    const issues = checkHorizonContinuity([horizon({ code: 'H1', topCm: 0, bottomCm: 30 }), horizon({ code: 'H2', topCm: 20, bottomCm: 60 })]);
    expect(issues.some((i) => i.message.includes('Chevauchement'))).toBe(true);
  });
  it('ne signale rien pour des horizons bien contigus', () => {
    expect(checkHorizonContinuity([horizon({ code: 'H1', topCm: 0, bottomCm: 30 }), horizon({ code: 'H2', topCm: 30, bottomCm: 60 })])).toEqual([]);
  });
});

describe('Cohérence GPS profil/site (§10.1) — cas réel annexe 18 du mémoire', () => {
  const site = { latitude: dms(3, 49, 35), longitude: dms(10, 39, 4) }; // NS1L2S1R

  it('NS1L2S6R : longitude 10°29\'04" au lieu de 10°39\'04" → signalé', () => {
    const profile = { latitude: dms(3, 49, 3), longitude: dms(10, 29, 4) };
    const issue = checkGpsConsistencyWithSite(profile, site);
    expect(issue?.severity).toBe('avertissement');
  });

  it("un point proche du site (quelques secondes d'écart) n'est pas signalé", () => {
    const profile = { latitude: dms(3, 49, 10), longitude: dms(10, 39, 4) }; // NS1L2S5R
    expect(checkGpsConsistencyWithSite(profile, site)).toBeNull();
  });
});

describe('Plausibilité de l\'unité de l\'azote total (§10.1)', () => {
  it("valeur > 1 (probable confusion %/g/kg) → avertissement", () => {
    const issue = checkNitrogenUnitPlausibility(horizon({ totalNitrogenPct: 2.5 }));
    expect(issue?.severity).toBe('avertissement');
  });
  it('valeur normale (< 1%) → aucun avertissement', () => {
    expect(checkNitrogenUnitPlausibility(horizon({ totalNitrogenPct: 0.18 }))).toBeNull();
  });
});
