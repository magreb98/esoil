/**
 * Comparaison Ndoupe (§ Étape 6) : les valeurs « moteur » sont calculées en direct contre les
 * bornes réelles du palmier à huile — ce test fige les écarts attendus par rapport au mémoire
 * (prompt v2 §10.2) pour éviter une régression silencieuse si les bornes changent.
 */
import { describe, expect, it } from 'vitest';
import { buildNdoupeComparison } from '../../src/lib/comparison/ndoupeComparison';

describe('Comparaison avec le mémoire — Ndoupe, palmier à huile', () => {
  const { climate, soil } = buildNdoupeComparison();

  it("durée de la saison sèche : mémoire S2, moteur S3 (frontière, règle §6)", () => {
    const r = climate.find((c) => c.label.includes('saison sèche'))!;
    expect(r.memoireClasse).toBe('S2');
    expect('classe' in r.moteur && r.moteur.classe).toBe('S3');
  });

  it('température moyenne annuelle : mémoire S1-1 (93,8), moteur S2 (~65,3)', () => {
    const r = climate.find((c) => c.label === 'Température moyenne annuelle')!;
    expect(r.memoireClasse).toBe('S1-1');
    expect('classe' in r.moteur && r.moteur.classe).toBe('S2');
    expect('ratio' in r.moteur && r.moteur.ratio).toBeCloseTo(65.3, 0);
  });

  it('température moyenne maximale annuelle : critère absent de la table de référence', () => {
    const r = climate.find((c) => c.label.includes('MAXIMALE'))!;
    expect('indisponible' in r.moteur).toBe(true);
  });

  it('précipitations et température min. absolue : mémoire et moteur concordent', () => {
    const precip = climate.find((c) => c.label === 'Précipitations annuelles')!;
    expect('classe' in precip.moteur && precip.moteur.classe).toBe(precip.memoireClasse);
    const tmin = climate.find((c) => c.label.includes('minimale absolue'))!;
    expect('classe' in tmin.moteur && tmin.moteur.classe).toBe(tmin.memoireClasse);
  });

  it("CEC de l'argile : non évaluable par le moteur (notation Sys non confirmée)", () => {
    const r = soil.find((c) => c.label.includes("CEC"))!;
    expect('indisponible' in r.moteur).toBe(true);
  });

  it('Drainage : mémoire "Bon"=S1-0, moteur "Bon"=S1-1 (imparfait est la vraie meilleure classe pour le palmier — recherche 2026-09-22, Kome et al.)', () => {
    const r = soil.find((c) => c.label === 'Drainage')!;
    expect(r.memoireClasse).toBe('S1-0');
    expect('classe' in r.moteur && r.moteur.classe).toBe('S1-1');
  });

  it('ESP : non évaluable par le moteur (bounds: null), contrairement au mémoire (S1-0)', () => {
    const r = soil.find((c) => c.label.includes('ESP'))!;
    expect(r.memoireClasse).toBe('S1-0');
    expect('indisponible' in r.moteur).toBe(true);
  });

  it('carbone organique : mémoire 89,14, moteur ~92,25 (écart documenté)', () => {
    const r = soil.find((c) => c.label === 'Carbone organique')!;
    expect(r.memoireRatio).toBeCloseTo(89.14, 1);
    expect('ratio' in r.moteur && r.moteur.ratio).toBeCloseTo(92.25, 1);
  });

  it("critères ordinaux (inondation, texture) : le moteur donne un ratio numérique valide, jamais NaN", () => {
    for (const label of ['Inondation', 'Texture / structure']) {
      const r = soil.find((c) => c.label === label)!;
      expect('classe' in r.moteur).toBe(true);
      if ('ratio' in r.moteur) expect(Number.isNaN(r.moteur.ratio)).toBe(false);
    }
  });

  it('pH du sol : mémoire et moteur concordent (S2, 70)', () => {
    const r = soil.find((c) => c.label === 'pH du sol')!;
    expect(r.memoireClasse).toBe('S2');
    expect('classe' in r.moteur && r.moteur.classe).toBe('S2');
    expect('ratio' in r.moteur && r.moteur.ratio).toBeCloseTo(70, 1);
  });
});
