/**
 * Test de référence principal (§11.1, README du paquet de données de référence) : exemple du
 * manuel, profil 197, Umbelúzi (Mozambique), maïs, intrants faibles (manuel p.45-48, images
 * `manuel_pdf53` à `manuel_pdf56`). Toutes les valeurs d'entrée et intermédiaires imprimées
 * sont transcrites ci-dessous ; les critères du maïs sont créés uniquement pour ce test, dans
 * cette fixture séparée des données de production (`src/config/reference/crops/`), car le
 * maïs n'a pas de table d'exigences dans le paquet de référence.
 *
 * Valeurs de ratio individuelles illisibles sur le scan (fumée/tache rouge, groupe I —
 * précipitations) : notées `// illisible sur le scan`, sans assertion dessus. Le minimum du
 * groupe (49) reste lisible car imprimé en toutes lettres dans la formule de l'indice
 * climatique, donc bien transcrit et vérifié.
 */
import { describe, expect, it } from 'vitest';
import { computeParametric } from '../../src/lib/evaluation/parametric';
import { computeNumberIntensity } from '../../src/lib/evaluation/numberIntensity';
import { computeLowestClass } from '../../src/lib/evaluation/lowestClass';
import { computeFinalNotation } from '../../src/lib/evaluation/notation';
import type { CriterionRating, LimitationCategory } from '../../src/lib/domain/types';

function rating(
  code: string,
  category: LimitationCategory,
  valeurParametrique: number,
  classe: CriterionRating['classe'],
  degre: CriterionRating['degre'],
  climateGroup?: CriterionRating['climateGroup']
): CriterionRating {
  return {
    criterionCode: code,
    label: code,
    category,
    climateGroup,
    valeurRetenue: 0,
    depthRule: 'surface',
    classe,
    degre,
    valeurParametrique,
    corrigible: false,
    source: 'Manuel, exemple profil 197 Umbelúzi (manuel p.45-46)',
    confidence: 'haute',
    trace: [],
  };
}

describe('Profil 197, Umbelúzi — maïs, intrants faibles (manuel p.45-48)', () => {
  // Groupe I : précipitations (manuel p.45). Minimum du groupe = 49 (donné dans la formule du
  // CI). Les ratios individuels des lignes 1, 2, 3 et 4 sont illisibles sur le scan (tache
  // rouge) ; seules les classes/degrés (parfaitement lisibles) sont transcrits pour ces
  // lignes, avec une valeur paramétrique cohérente placée au sein de la classe (n'affecte
  // aucune assertion, seul le minimum du groupe — vérifié — intervient dans le calcul du CI).
  const climateRatings: CriterionRating[] = [
    rating('precip_cycle', 'c', 59, 'S3', 3, 'eau'), // 394mm — ratio illisible sur le scan, placeholder dans la classe S3
    rating('precip_m1', 'c', 64, 'S2', 2, 'eau'), // 79mm — ratio illisible sur le scan, placeholder dans la classe S2
    rating('precip_m2', 'c', 66, 'S2', 2, 'eau'), // 127mm — ratio illisible sur le scan, placeholder dans la classe S2
    rating('precip_m3', 'c', 55, 'S3', 3, 'eau'), // 119mm — ratio illisible sur le scan, placeholder dans la classe S3
    rating('precip_m4', 'c', 49, 'S3', 3, 'eau'), // 69mm — minimum du groupe I, vérifié (imprimé dans la formule du CI)
    rating('t_moy_cycle', 'c', 95, 'S1-1', 1, 'temperature'), // 26,2°C
    rating('t_min_cycle', 'c', 91, 'S1-1', 1, 'temperature'), // 20,4°C — minimum du groupe II, vérifié
    rating('hr_m2', 'c', 100, 'S1-0', 0, 'humidite_air'), // 69,0%
    rating('hr_m4', 'c', 86, 'S1-1', 1, 'humidite_air'), // 72,0% — minimum du groupe III, vérifié
    rating('n_sur_N_m2', 'c', 94, 'S1-1', 1, 'insolation'), // 0,62
    rating('n_sur_N_m4', 'c', 88, 'S1-1', 1, 'insolation'), // 0,56 — minimum du groupe IV, vérifié
  ];

  // Sol, unité M1 (manuel p.46) : toutes les valeurs et ratios sont lisibles.
  const soilRatings: CriterionRating[] = [
    rating('pente', 't', 100, 'S1-0', 0), // < 1%
    rating('inondation', 'w', 100, 'S1-0', 0), // F0
    rating('drainage', 'w', 95, 'S1-1', 1), // modéré
    rating('texture', 's', 95, 'S1-1', 1), // SCL
    rating('elements_grossiers', 's', 100, 'S1-0', 0), // 0%
    rating('profondeur_sol', 's', 100, 'S1-0', 0), // > 100cm
    rating('caco3', 's', 100, 'S1-0', 0), // < 1%
    rating('gypse', 's', 100, 'S1-0', 0), // 0%
    rating('cec_argile', 'f', 100, 'S1-0', 0), // 91 meq/100g
    rating('saturation_bases', 'f', 100, 'S1-0', 0), // 93% — « * = méthode paramétrique : retient le plus bas des deux » avec pH
    rating('carbone_organique', 'f', 89, 'S1-1', 1), // 0,96%
    rating('ph', 'f', 100, 'S1-0', 0), // 6,2 — plus bas des deux (pH, saturation en bases) = 100 : égalité, aucun impact
    rating('ece', 'n', 73, 'S2', 2), // 4,6 mmhos/cm
    rating('esp', 'n', 75, 'S2', 2), // 18%
  ];

  it('Indice climatique CI ≈ 33,7 (§7.3) — produit des minima des 4 groupes (49 × 91/100 × 86/100 × 88/100)', () => {
    const result = computeParametric(climateRatings, []);
    expect(result.indiceClimatique).toBeCloseTo(33.7, 1);
  });

  it('Taux climatique CR = 47 (16,67 + 0,9 × CI)', () => {
    const result = computeParametric(climateRatings, []);
    expect(result.tauxClimatique).toBeCloseTo(47, 0);
  });

  it('Indice de sol IS ≈ 43,98 puis indice de terre IT ≈ 20,7 (manuel : "= 20.7 final rating")', () => {
    const result = computeParametric(climateRatings, soilRatings);
    expect(result.indiceSol).toBeCloseTo(43.98, 1);
    expect(result.indiceTerre).toBeCloseTo(20.7, 1);
  });

  it('Méthode paramétrique : IT ≈ 20,7 → classe S3/N (grille 15-25, manuel p.47)', () => {
    const result = computeParametric(climateRatings, soilRatings);
    expect(result.classe).toBe('S3/N');
  });

  it('Plus basse classe : climat S3, sol S2 → conclusion S3, catégorie climat (manuel p.47 : "climate: S3 / soil: S2 / conclusion: S3,c")', () => {
    const lowest = computeLowestClass([...climateRatings, ...soilRatings]);
    expect(lowest.classe).toBe('S3');
    expect(lowest.limitingCategories).toEqual(['c']);
  });

  it('Nombre et intensité des limitations : climat S3, sol S2 (manuel p.47)', () => {
    const result = computeNumberIntensity(climateRatings, soilRatings);
    expect(result.classeClimat).toBe('S3');
    expect(result.classeSol).toBe('S2');
  });

  it('Notation finale : la méthode paramétrique (S3/N) est la plus prudente des trois — manuel : "Profile 197: S3/N, c" (p.48)', () => {
    const lowest = computeLowestClass([...climateRatings, ...soilRatings]);
    const numberIntensity = computeNumberIntensity(climateRatings, soilRatings);
    const parametric = computeParametric(climateRatings, soilRatings);
    const { mostPrudentClass, methodsAgree } = computeFinalNotation(lowest, numberIntensity, parametric);
    expect(mostPrudentClass).toBe('S3/N');
    expect(methodsAgree).toBe(false); // désaccord réel entre méthodes, tel que dans l'exemple du manuel
  });
});

describe('Rendement maïs (tableau 7, entrée maize_grain_lowland) — manuel p.48', () => {
  it('S3 intrants élevés 1,5-3,5 t/ha × 0,45 (intrants faibles, groupe mais_ananas_groupe) = 0,7-1,6 t/ha', async () => {
    const yieldTable = (await import('../../src/config/reference/yield-table-rainfed.json')).default;
    const correctionFactors = (await import('../../src/config/reference/correction-factors.json')).default;

    const entry = yieldTable.entries.find((e) => e.cropCode === 'maize_grain_lowland')!;
    expect(entry.range.S3).toEqual([1.5, 3.5]);

    const group = correctionFactors.specifiques.find((g) => g.groupe === 'mais_ananas_groupe')!;
    expect(group.faible).toBeCloseTo(0.45);

    const estimated: [number, number] = [entry.range.S3[0] * group.faible, entry.range.S3[1] * group.faible];
    expect(estimated[0]).toBeCloseTo(0.675, 2); // 0,7 arrondi
    expect(estimated[1]).toBeCloseTo(1.575, 2); // 1,6 arrondi
  });
});

describe("Méthode du nombre et de l'intensité des limitations — exemple générique du manuel (§7.2)", () => {
  function degradedRatings(counts: Partial<Record<1 | 2 | 3, number>>, category: LimitationCategory): CriterionRating[] {
    const ratings: CriterionRating[] = [];
    let idx = 0;
    for (const [degre, count] of Object.entries(counts)) {
      for (let i = 0; i < (count ?? 0); i++) {
        ratings.push(rating(`${category}_${idx++}`, category, 50, 'S3', Number(degre) as 1 | 2 | 3));
      }
    }
    return ratings;
  }

  it('5 légères + 2 modérées + 3 sévères au climat → S3 ; 3 légères + 2 modérées au sol → S2 ; final S3c', () => {
    const climate = degradedRatings({ 1: 5, 2: 2, 3: 3 }, 'c');
    const soil = degradedRatings({ 1: 3, 2: 2 }, 's');

    const result = computeNumberIntensity(climate, soil);
    expect(result.classeClimat).toBe('S3');
    expect(result.classeSol).toBe('S2');
    expect(result.classe).toBe('S3');
  });
});
