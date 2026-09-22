/**
 * Fumée : tous les modules qui valident le paquet de données de référence au chargement
 * (Zod, erreurs lisibles) doivent s'importer sans lever d'exception. Un bug de schéma ici
 * plante toute l'application au démarrage (écran blanc) sans qu'aucun autre test unitaire ne
 * le détecte, puisqu'ils n'importent pas forcément ces modules — d'où ce test dédié, rapide,
 * qui aurait attrapé plus tôt le bug réel trouvé lors du test hors ligne (Étape 4) : un
 * `z.record` avec une clé énumérée qui exigeait à tort la présence de N1 ET N2 dans chaque
 * fourchette du tableau 7.
 */
import { describe, expect, it } from 'vitest';

describe('Chargement des fichiers de référence (Zod)', () => {
  it('CROPS (registre des cultures)', async () => {
    const { CROPS } = await import('../../src/config/crops');
    expect(CROPS.length).toBeGreaterThan(0);
  });

  it('tableau 7 des rendements', async () => {
    const mod = await import('../../src/lib/yield/yieldTable');
    const result = mod.lookupHighInputYield('cassava', 'S2');
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it('facteurs de correction / niveaux de gestion', async () => {
    const mod = await import('../../src/lib/yield/managementLevels');
    const estimate = mod.estimateYield('cassava', 'S2', 'faible');
    expect(estimate.entries.length).toBeGreaterThan(0);
  });
});
