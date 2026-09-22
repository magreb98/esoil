/**
 * Modèle de données du moteur d'évaluation des terres FAO (méthode Sys / Beernaert & Bitondo).
 * Cf. Prompt d'implémentation v2, §3. Ce fichier ne dépend jamais de React.
 */

// ---------------------------------------------------------------------------
// Classes et catégories (manuel p.14, p.24-27)
// ---------------------------------------------------------------------------

/** Les 6 classes d'aptitude du manuel (jamais 5 — erreur de la v1). */
export type SuitabilityClass = 'S1-0' | 'S1-1' | 'S2' | 'S3' | 'N1' | 'N2';

export const SUITABILITY_CLASSES: readonly SuitabilityClass[] = ['S1-0', 'S1-1', 'S2', 'S3', 'N1', 'N2'];

/** Grille de l'indice de terre (méthode paramétrique, p.27) : classes intermédiaires officielles. */
export type FinalClass =
  | 'S1-0'
  | 'S1-0/1'
  | 'S1-1'
  | 'S1-1/S2'
  | 'S2'
  | 'S2/S3'
  | 'S3'
  | 'S3/N'
  | 'N1'
  | 'N2';

/** Degré de limitation : 0 aucune, 1 légère, 2 modérée, 3 sévère, 4 très sévère. */
export type LimitationDegree = 0 | 1 | 2 | 3 | 4;

/** 6 catégories de limitation (jamais 4 — erreur de la v1). */
export type LimitationCategory = 'c' | 't' | 'w' | 's' | 'f' | 'n';

export const LIMITATION_CATEGORIES: readonly LimitationCategory[] = ['c', 't', 'w', 's', 'f', 'n'];

export const LIMITATION_CATEGORY_LABELS: Record<LimitationCategory, string> = {
  c: 'Climat',
  t: 'Topographie',
  w: 'Humidité (drainage / inondation)',
  s: 'Sol physique',
  f: 'Fertilité',
  n: 'Salinité / sodicité',
};

// ---------------------------------------------------------------------------
// Profil pédologique (horizons)
// ---------------------------------------------------------------------------

export type SoilStructure =
  | 'granulaire'
  | 'polyedrique'
  | 'massive'
  | 'vertique'
  | 'oxique'
  | 'particulaire';

export type CoarseFragmentsType = 'quartz' | 'oxyde_de_fer' | 'roche_alteree';

export interface Horizon {
  code: string; // H1, H2...
  topCm: number;
  bottomCm: number;
  sandPct: number;
  siltPct: number;
  clayPct: number;
  structure?: SoilStructure;
  coarseFragmentsPct?: number;
  coarseFragmentsType?: CoarseFragmentsType;
  bulkDensity?: number;
  phWater: number;
  phKcl?: number;
  organicCarbonPct: number;
  totalNitrogenPct?: number;
  /** cmol(+)/kg = méq/100g */
  exchCa: number;
  exchMg: number;
  exchK: number;
  exchNa: number;
  /** CEC du sol, acétate d'ammonium pH 7 */
  cec: number;
  /** Bray II, ppm */
  assimilablePppm?: number;
  /** mmhos/cm */
  ece?: number;
  caco3Pct?: number;
  gypsumPct?: number;
  munsellColor?: string;
}

export type DrainageClass =
  | 'bon'
  | 'modere'
  | 'imparfait'
  | 'pauvre_aere'
  | 'pauvre_drainable'
  | 'pauvre_non_drainable'
  | 'tres_pauvre';

export type FloodingClass = 'F0' | 'F1' | 'F2' | 'F3' | 'F4';

export interface Profile {
  id: string;
  siteId: string;
  soilUnit: string;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  slopePct: number;
  drainageClass: DrainageClass;
  floodingClass: FloodingClass;
  /** Profondeur jusqu'à la roche / cuirasse, en cm. */
  effectiveDepthCm: number;
  wrbName?: string;
  horizons: Horizon[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Climat
// ---------------------------------------------------------------------------

export interface MonthlyClimate {
  /** 1-12 */
  month: number;
  precipitationMm: number;
  tMeanC: number;
  tMaxC: number;
  tMinC: number;
  relativeHumidityPct?: number;
  /** n : heures d'ensoleillement effectif (≠ N, durée astronomique du jour) */
  sunshineHoursN?: number;
  /** Si fournie, prime sur le calcul de Thornthwaite (§5.1). */
  petMm?: number;
}

export interface ClimateSeries {
  id: string;
  siteId: string;
  /** Source de la série : saisie manuelle ou import NASA POWER. */
  source: 'manuel' | 'nasa_power';
  months: MonthlyClimate[]; // 12 entrées, month 1..12
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Site / Projet (hiérarchie Projet → Site → Profil → Horizons)
// ---------------------------------------------------------------------------

export interface MethodParameters {
  /** Source de l'ETP : calculée (Thornthwaite) ou fournie par l'utilisateur. [À CONFIRMER §5.1] */
  etpSource: 'thornthwaite' | 'saisie_manuelle';
  /** Réserve utile maximale du sol pour le bilan hydrique, mm. Défaut manuel/mémoire annexe 1. [À CONFIRMER §5.2] */
  waterHoldingCapacityMm: number;
  /** Échelle de pente applicable par défaut. [À CONFIRMER §3, slopeScale] */
  defaultSlopeScale: 1 | 2 | 3;
}

export const DEFAULT_METHOD_PARAMETERS: MethodParameters = {
  etpSource: 'thornthwaite',
  waterHoldingCapacityMm: 100,
  defaultSlopeScale: 1,
};

export interface Site {
  id: string;
  projectId: string;
  name: string;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  methodParameters: MethodParameters;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cultures (registre)
// ---------------------------------------------------------------------------

export type ClimateGroup = 'eau' | 'temperature' | 'humidite_air' | 'insolation';

export type CriterionKind =
  | 'numerique_croissant'
  | 'numerique_decroissant'
  | 'numerique_optimum'
  | 'ordinal'
  /** CEC de l'argile, notation Sys « < 16 (-) / < 16 (+) » — non évaluable tant que la règle n'est pas confirmée. */
  | 'special_sys_cec';

/** Fiabilité de la transcription depuis les sources (paquet de données de référence). */
export type Confidence = 'haute' | 'moyenne' | 'faible';

/**
 * Règle de profondeur — code du paquet de données de référence (method-formulas.md §4).
 * `surface` (ou absent) = valeur du premier horizon décrit, sans agrégation ni moyenne.
 */
export type DepthRuleCode = '0_15cm' | '0_30cm' | 'a_50cm' | 'moyenne_0_100' | 'max_0_100' | 'ponderation_25cm' | 'surface';

/** [min, max] ; `null` = borne ouverte (non majorée si en 2e position, non minorée si en 1re). */
export type ReferenceInterval = [number | null, number | null];

export type NumericBounds = Partial<Record<SuitabilityClass, ReferenceInterval[]>>;
export type OrdinalBounds = Partial<Record<SuitabilityClass, string[]>>;
/** Critère « pente » : une table de bornes par échelle (manuel §3, p.19) — l'échelle active vient de `MethodParameters.defaultSlopeScale`. */
export type SlopeScaleBounds = { echelle_1?: NumericBounds; echelle_2?: NumericBounds; echelle_3?: NumericBounds };

/** `null` = critère non évaluable en l'état (lecture impossible ou incohérente à la source) — jamais deviné. */
export type CriterionBounds = NumericBounds | OrdinalBounds | SlopeScaleBounds | null;

export interface CriterionRequirement {
  code: string;
  label: string;
  unit?: string;
  category: LimitationCategory;
  climateGroup?: ClimateGroup;
  kind: CriterionKind;
  bounds: CriterionBounds;
  /** N1 (corrigible) vs N2 (non corrigible) — pilote l'aptitude potentielle. */
  correctable: boolean;
  /** Absent = valeur de surface (premier horizon), comme `surface`. */
  depthRule?: DepthRuleCode;
  /** Page/table d'origine — obligatoire, jamais une valeur inventée. */
  source: string;
  confidence: Confidence;
  /** Explication d'une transcription douteuse, d'un écart ou d'une hypothèse retenue. */
  note?: string;
  /** Lecture brute de la source quand elle est incohérente (cf. `note`), à titre documentaire seulement. */
  lectureLitterale?: Record<string, string>;
}

export type VerificationStatus = 'verifie' | 'transcrit_non_verifie' | 'manquant';

export interface CropDefinition {
  code: string;
  name: string;
  scientificName: string;
  lifecycle: 'perenne' | 'annuelle' | 'semi-perenne';
  /** `null` si non documentée à la source — un défaut opérationnel est alors appliqué (method.json → rootingDepthDefaultsCm), jamais silencieusement. */
  rootingDepthCm: number | null;
  climateRequirements: CriterionRequirement[];
  soilRequirements: CriterionRequirement[];
  correctionFactorGroup: string;
  source: string;
  verificationStatus: VerificationStatus;
  note?: string;
  conventions?: string;
}

/** Critère écarté du calcul (bornes nulles, notation Sys non confirmée, ou donnée introuvable) — jamais un calcul silencieux. */
export interface NonEvaluatedCriterion {
  code: string;
  label: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Résultats de notation et d'évaluation
// ---------------------------------------------------------------------------

export interface CriterionRating {
  criterionCode: string;
  label: string;
  category: LimitationCategory;
  climateGroup?: ClimateGroup;
  /** Valeur retenue après application de la règle de profondeur. */
  valeurRetenue: number | string;
  unit?: string;
  depthRule: DepthRuleCode | 'non-soil';
  classe: SuitabilityClass;
  degre: LimitationDegree;
  valeurParametrique: number;
  corrigible: boolean;
  source: string;
  confidence: Confidence;
  note?: string;
  /** Détail du calcul pour la traçabilité (formule appliquée, étapes). */
  trace: string[];
}

export interface LowestClassResult {
  method: 'plus_basse_classe';
  classe: SuitabilityClass;
  /** Catégories qui atteignent la classe finale (pour la sous-classe, ex. S3f). */
  limitingCategories: LimitationCategory[];
  parCategorie: Record<LimitationCategory, SuitabilityClass | null>;
}

export interface NumberIntensityResult {
  method: 'nombre_intensite';
  classeClimat: SuitabilityClass;
  classeSol: SuitabilityClass;
  classe: SuitabilityClass;
  counts: {
    climat: Record<LimitationDegree, number>;
    sol: Record<LimitationDegree, number>;
  };
}

export interface ParametricResult {
  method: 'parametrique';
  indiceClimatique: number; // CI
  tauxClimatique: number; // CR
  indiceSol: number; // IS
  indiceTerre: number; // IT
  classe: FinalClass;
  climateGroupMinimums: Partial<Record<ClimateGroup, { value: number; criterionCode: string }>>;
  soilIndexDetail: { includedCriteria: string[]; phOrBaseSaturationMin?: { value: number; criterionCode: string } };
}

export interface CropEvaluation {
  cropCode: string;
  profileId: string;
  climateSeriesId: string;
  computedAt: string;
  soilRatings: CriterionRating[];
  climateRatings: CriterionRating[];
  lowestClass: LowestClassResult;
  numberIntensity: NumberIntensityResult;
  parametric: ParametricResult;
  /** Notation finale complète, ex. "S3/N(c,f)". Prend la classe la plus prudente si désaccord. */
  finalNotation: string;
  methodsAgree: boolean;
  /** Critères non évalués (bornes nulles, notation Sys non confirmée, donnée absente) — jamais un calcul silencieux. */
  missingCriteria: NonEvaluatedCriterion[];
}

export type ManagementLevel = 'faible' | 'intermediaire' | 'eleve';

/** Une culture peut avoir plusieurs entrées au tableau 7 (ex. palmier : régimes, huile, palmistes) — jamais une seule choisie arbitrairement. */
export interface YieldEstimateEntry {
  yieldEntryCode: string;
  yieldEntryLabel: string;
  unit: string;
  rangeHighInputTPerHa: [number, number] | null;
  estimatedRangeTPerHa: [number, number] | null;
  source: string;
  confidence: Confidence;
}

export interface YieldEstimate {
  cropCode: string;
  classe: SuitabilityClass | FinalClass;
  managementLevel: ManagementLevel;
  correctionFactorGroup: string;
  correctionFactorStatus: 'verifie' | 'a_confirmer' | 'inconnu';
  correctionFactorNote?: string;
  correctionFactor: number | null; // null si groupe/valeur manquante
  entries: YieldEstimateEntry[];
  isTheoreticalEstimate: true;
  isDataMissing: boolean;
}
