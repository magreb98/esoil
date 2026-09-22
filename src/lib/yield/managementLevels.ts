/** Facteurs de correction selon le niveau d'intrants (§8.2, paquet de données de référence). */
import type { Confidence, FinalClass, ManagementLevel, YieldEstimate } from '../domain/types';
import correctionFactorsRaw from '../../config/reference/correction-factors.json';
import { correctionFactorsReferenceSchema, parseReferenceFile } from '../domain/referenceSchema';
import { lookupHighInputYield } from './yieldTable';

const correctionFactors = parseReferenceFile(correctionFactorsReferenceSchema, correctionFactorsRaw, 'reference/correction-factors.json');

/** Les facteurs spécifiques (par groupe de cultures) priment sur les facteurs généraux. */
function findFactorGroup(groupe: string): { moyen: number; faible: number } | null {
  const specific = correctionFactors.specifiques.find((g) => g.groupe === groupe);
  if (specific) return specific;
  const general = correctionFactors.general[groupe];
  return general ?? null;
}

export function getCorrectionFactor(groupe: string, level: ManagementLevel): number | null {
  if (level === 'eleve') return 1;
  const group = findFactorGroup(groupe);
  if (!group) return null;
  return level === 'intermediaire' ? group.moyen : group.faible;
}

export function estimateYield(cropCode: string, classe: FinalClass, managementLevel: ManagementLevel): YieldEstimate {
  const affectation = correctionFactors.affectationCulturesDuProjet[cropCode];
  const groupe = affectation?.groupe ?? '';
  const factor = groupe ? getCorrectionFactor(groupe, managementLevel) : null;
  const lookup = lookupHighInputYield(cropCode, classe);

  const entries = lookup.entries.map((e) => ({
    yieldEntryCode: e.cropCode,
    yieldEntryLabel: e.cropLabel,
    unit: e.unit,
    rangeHighInputTPerHa: e.rangeHighInputTPerHa,
    estimatedRangeTPerHa:
      e.rangeHighInputTPerHa && factor !== null ? ([e.rangeHighInputTPerHa[0] * factor, e.rangeHighInputTPerHa[1] * factor] as [number, number]) : null,
    source: e.source,
    confidence: e.confidence as Confidence,
  }));

  return {
    cropCode,
    classe,
    managementLevel,
    correctionFactorGroup: groupe,
    correctionFactorStatus: affectation?.statut ?? 'inconnu',
    correctionFactorNote: affectation?.note,
    correctionFactor: factor,
    entries,
    isTheoreticalEstimate: true,
    isDataMissing: lookup.isDataMissing || factor === null,
  };
}
