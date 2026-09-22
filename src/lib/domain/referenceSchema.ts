/**
 * Validation Zod du paquet de données de référence (`src/config/reference/`).
 * Erreurs lisibles au chargement — un fichier de référence invalide ne doit jamais
 * planter silencieusement ni être ignoré sans avertissement.
 */
import { z } from 'zod';

const limitationCategory = z.enum(['c', 't', 'w', 's', 'f', 'n']);
const climateGroup = z.enum(['eau', 'temperature', 'humidite_air', 'insolation']);
const confidence = z.enum(['haute', 'moyenne', 'faible']);
const criterionKind = z.enum(['numerique_croissant', 'numerique_decroissant', 'numerique_optimum', 'ordinal', 'special_sys_cec']);
const depthRuleCode = z.enum(['0_15cm', '0_30cm', 'a_50cm', 'moyenne_0_100', 'max_0_100', 'ponderation_25cm', 'surface']);

/**
 * `bounds` a plusieurs formes possibles selon le critère (numérique, ordinal, pente à 3
 * échelles) ou peut être `null` (non évaluable). On valide juste que c'est un objet ou
 * `null` ici — la forme précise est interprétée à l'exécution par `boundsShape.ts`, qui
 * échoue explicitement si elle ne reconnaît aucune forme connue.
 */
const boundsSchema = z.union([z.record(z.string(), z.unknown()), z.null()]);

const criterionSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    unit: z.string().optional(),
    category: limitationCategory,
    climateGroup: climateGroup.optional(),
    kind: criterionKind,
    bounds: boundsSchema,
    correctable: z.boolean(),
    depthRule: depthRuleCode.optional(),
    source: z.string().min(1),
    confidence,
    note: z.string().optional(),
    lectureLitterale: z.record(z.string(), z.string()).optional(),
  })
  // un champ inattendu du paquet est conservé sans faire échouer la validation
  .loose();

export const cropReferenceSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    scientificName: z.string().min(1),
    lifecycle: z.enum(['perenne', 'annuelle', 'semi-perenne']),
    rootingDepthCm: z.number().nullable().optional(),
    correctionFactorGroup: z.string().min(1),
    source: z.string().min(1),
    verificationStatus: z.enum(['verifie', 'transcrit_non_verifie', 'manquant']),
    climateRequirements: z.array(criterionSchema),
    soilRequirements: z.array(criterionSchema),
    note: z.string().optional(),
    conventions: z.string().optional(),
  })
  .loose();

export type CropReferenceParsed = z.infer<typeof cropReferenceSchema>;

const yieldEntrySchema = z
  .object({
    cropCode: z.string().min(1),
    cropLabel: z.string().min(1),
    unit: z.string(),
    system: z.string(),
    inputLevel: z.string(),
    // z.record avec une clé énumérée exigerait TOUTES les clés possibles (S1-0..N2 et N) —
    // les entrées réelles n'en couvrent que 5 (S1-0, S1-1, S2, S3, N) : clé libre, non stricte.
    range: z.record(z.string(), z.tuple([z.number(), z.number()])),
    source: z.string().min(1),
    confidence,
  })
  .loose();

export const yieldTableReferenceSchema = z
  .object({
    description: z.string(),
    reductionParClasse_pctRendementOptimal: z.record(z.string(), z.tuple([z.number(), z.number()])),
    entries: z.array(yieldEntrySchema),
  })
  .loose();

const correctionGroupSchema = z.object({ moyen: z.number(), faible: z.number() }).loose();

export const correctionFactorsReferenceSchema = z
  .object({
    description: z.string(),
    general: z.record(z.string(), correctionGroupSchema),
    specifiques: z.array(correctionGroupSchema.extend({ groupe: z.string(), cultures: z.array(z.string()) })),
    affectationCulturesDuProjet: z.record(
      z.string(),
      z.object({ groupe: z.string(), statut: z.enum(['verifie', 'a_confirmer']), note: z.string().optional() }).loose()
    ),
  })
  .loose();

/** Lève une erreur lisible (fichier + détail Zod) plutôt que de planter avec une trace opaque. */
export function parseReferenceFile<T>(schema: z.ZodType<T>, data: unknown, fileLabel: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => `  - ${i.path.join('.') || '(racine)'} : ${i.message}`).join('\n');
    throw new Error(`Paquet de données de référence invalide dans "${fileLabel}" :\n${details}`);
  }
  return result.data;
}
