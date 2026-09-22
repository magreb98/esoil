/**
 * Mode « comparaison avec le mémoire » (§ Étape 6), site de Ndoupe, palmier à huile.
 * Colonnes « mémoire » : fixture saisie depuis memoire_p60 (tableau 3, climat) et memoire_p61
 * (tableau 4, sol). Colonnes « moteur » : calculées EN DIRECT avec `rateNumericCriterion`
 * contre les bornes réelles de `src/config/reference/crops/oil-palm.json`, sur la même
 * valeur d'entrée — jamais une seconde fixture figée, pour que la comparaison reste vraie si
 * le paquet de référence change. Les écarts reprennent ceux déjà identifiés au prompt v2 §10.2.
 */
import oilPalm from '../../config/reference/crops/oil-palm.json';
import { rateNumericCriterion, rateOrdinalCriterion } from '../rating/interpolation';
import { isOrdinalBounds, isSlopeScaleBounds, selectSlopeScale } from '../rating/boundsShape';
import type { CriterionBounds, NumericBounds } from '../domain/types';

export interface ComparisonRow {
  label: string;
  value: string;
  source: 'memoire_p60' | 'memoire_p61';
  memoireClasse: string;
  memoireRatio: number;
  moteur: { classe: string; ratio: number; source: string } | { indisponible: string };
  ecart?: string;
}

function findCriterion(code: string) {
  return [...oilPalm.climateRequirements, ...oilPalm.soilRequirements].find((c) => c.code === code);
}

/** `engineValue` : nombre pour un critère numérique, code Sys/FAO (ex. "F0", "CL") pour un critère ordinal — jamais une conversion implicite entre les deux. */
function computeMoteur(code: string, engineValue: number | string): ComparisonRow['moteur'] {
  const req = findCriterion(code);
  if (!req) return { indisponible: 'Critère absent de la table de référence transcrite (oil-palm.json)' };
  if (req.kind === 'special_sys_cec') return { indisponible: req.note ?? 'Notation Sys (-)/(+) non confirmée — non évaluable' };
  if (req.bounds === null) return { indisponible: req.note ?? 'Aucune donnée de référence lisible' };
  let bounds = req.bounds as CriterionBounds;
  // "pente" : bornes par échelle (manuel §3) — le site de Ndoupe utilise l'échelle 3 (défaut du projet).
  if (isSlopeScaleBounds(bounds)) bounds = selectSlopeScale(bounds, 3);

  if (req.kind === 'ordinal') {
    if (!isOrdinalBounds(bounds)) return { indisponible: 'Forme de bornes non reconnue pour ce critère ordinal' };
    const result = rateOrdinalCriterion(String(engineValue), bounds);
    if (!result) return { indisponible: `Valeur "${engineValue}" absente des classes définies pour ce critère` };
    return { classe: result.classe, ratio: result.valeurParametrique, source: req.source };
  }

  const result = rateNumericCriterion(Number(engineValue), { bounds: bounds as NumericBounds, kind: req.kind as 'numerique_croissant' | 'numerique_decroissant' | 'numerique_optimum', label: req.label });
  return { classe: result.classe, ratio: Math.round(result.valeurParametrique * 100) / 100, source: req.source };
}

function row(label: string, engineValue: number | string, valueLabel: string, source: 'memoire_p60' | 'memoire_p61', code: string | null, memoireClasse: string, memoireRatio: number, ecart?: string): ComparisonRow {
  const moteur = code ? computeMoteur(code, engineValue) : { indisponible: 'Non rattaché à un critère du paquet de référence' };
  return { label, value: valueLabel, source, memoireClasse, memoireRatio, moteur, ecart };
}

export function buildNdoupeComparison(): { climate: ComparisonRow[]; soil: ComparisonRow[]; notes: string[] } {
  const climate: ComparisonRow[] = [
    row('Précipitations annuelles', 1890.93, '1 890,93 mm', 'memoire_p60', 'precip_annuelle', 'S1-1', 91.36),
    row('Durée de la saison sèche (P < ½ETP)', 3, '3 mois', 'memoire_p60', 'mois_secs', 'S2', 60,
      'Le mémoire classe S2 la valeur-frontière 60 ; le moteur retient la classe inférieure (S3) sur une borne partagée (§6 [À CONFIRMER]).'),
    row('Température moyenne MAXIMALE annuelle', 32.43, '32,43 °C', 'memoire_p60', null, 'S1-0', 100,
      "Critère absent de la table d'exigences transcrite du palmier (annexe 13) — probable confusion avec un autre critère au moment de la rédaction du mémoire."),
    row('Température minimale absolue du mois le plus froid', 18.11, '18,11 °C', 'memoire_p60', 't_min_abs_mois_froid', 'S1-1', 85.55),
    row('Température moyenne annuelle', 24.64, '24,64 °C', 'memoire_p60', 't_moy_annuelle', 'S1-1', 93.8,
      "24-27°C = S2 dans l'annexe 12 (le mémoire semble avoir utilisé un autre jeu de seuils, ou confondu avec la ligne précédente)."),
    row('Insolation annuelle (n/N)', 0.49, '0,49', 'memoire_p60', 'n_sur_N', 'S1-1', 86.33),
  ];

  const soil: ComparisonRow[] = [
    row('Pente', 3.2, '3,20 %', 'memoire_p61', 'pente', 'S1-0', 100),
    row('Inondation', 'F0', 'F0', 'memoire_p61', 'inondation', 'S1-0', 100),
    row('Drainage', 'bon', 'Bon', 'memoire_p61', 'drainage', 'S1-0', 100,
      "Le mémoire note « Bon » = S1-0 (meilleure classe), mais les exigences spécifiques du palmier à huile (annexe 13, confirmées par Kome et al. 2020) placent « Imparfait » en S1-0 et « Bon » seulement en S1-1 : le palmier tolère mal un drainage excessif (besoin d'humidité constante), à l'inverse de la plupart des cultures."),
    row('Texture / structure', 'CL', 'CL', 'memoire_p61', 'texture', 'S1-1', 95),
    row('Profondeur du sol', 200, '200 cm', 'memoire_p61', 'profondeur_sol', 'S1-0', 100),
    row('CaCO3', 0, '0 %', 'memoire_p61', 'caco3', 'S1-0', 100),
    row('Gypse', 0, '0 %', 'memoire_p61', 'gypse', 'S1-0', 100),
    row('CEC de l\'argile', 5.61, '5,61 cmol(+)/kg', 'memoire_p61', 'cec_argile', 'S3', 60,
      "Notation Sys « (-)/(+) » non confirmée (method-formulas.md) : le moteur ne peut pas évaluer ce critère. La valeur du mémoire (5,61) semble par ailleurs omettre la division par le taux d'argile de la formule (CEC−2·CO)×100/argile — recalculée, la CEC de l'argile vaudrait plutôt 13 à 19 cmol/kg selon l'horizon."),
    row('Saturation en bases', 28.94, '28,94 %', 'memoire_p61', 'saturation_bases', 'S1-1', 90.96),
    row('Carbone organique', 1.09, '1,09 %', 'memoire_p61', 'carbone_organique', 'S1-1', 89.14,
      "Le mémoire note 89,14 ; l'interpolation contre les bornes de l'annexe 13 donne 92,25 — écart non expliqué, à documenter."),
    row('pH du sol', 4.7, '4,7', 'memoire_p61', 'ph', 'S2', 70),
    row('Conductivité électrique (ECe)', 0.07, '0,07 mmhos/cm', 'memoire_p61', 'ece', 'S1-0', 100),
    row('Sodium échangeable (ESP)', 0.51, '0,51 %', 'memoire_p61', 'esp', 'S1-0', 100,
      "Aucune valeur lisible dans l'annexe 13 pour ce critère (bounds: null) — le moteur ne peut pas évaluer l'ESP du palmier, contrairement au mémoire qui lui attribue S1-0."),
  ];

  const notes = [
    "Indice climatique (IC) : le mémoire écrit IC = 60 × 85,55/100 × 86,33/100 = 44,31, cohérent avec 3 groupes (eau=60, température=min(100;85,55;93,8)=85,55, insolation=86,33) — mais ces minima proviennent des classifications ci-dessus, dont deux diffèrent de celles du moteur (durée de la saison sèche, température moyenne annuelle).",
    "Écriture du taux climatique (CR) : le mémoire écrit CR = 44,31 + 0,9 × 16,67 = 56,54 (opérandes inversés) ; la formule correcte est CR = 16,67 + 0,9 × 44,31 = 56,55 — coquille sans effet notable sur le résultat.",
    "Indice pédologique (IP) : le mémoire écrit IP = 0,59 mais utilise ensuite 0,35 dans la suite du calcul — incohérence d'écriture. En incluant la CEC de l'argile (si elle était évaluable), l'indice recalculé serait plutôt d'environ 0,3556.",
    "ETP annuelle : le mémoire indique une réserve utile et une ETP d'environ 1 033 mm sur l'année ; recalculée avec la formule de Thornthwaite du manuel sur les températures de Ndoupe, l'ETP annuelle vaut plutôt environ 1 314 mm — source de l'ETP du mémoire non clarifiée.",
  ];

  return { climate, soil, notes };
}
