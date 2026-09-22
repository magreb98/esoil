/** Rendements théoriques (§8.2, tableau 7 — pluvial, intrants élevés, paquet de données de référence). */
import type { FinalClass } from '../domain/types';
import yieldTableRaw from '../../config/reference/yield-table-rainfed.json';
import { yieldTableReferenceSchema, parseReferenceFile } from '../domain/referenceSchema';
import methodConfig from '../../config/method.json';

const yieldTable = parseReferenceFile(yieldTableReferenceSchema, yieldTableRaw, 'reference/yield-table-rainfed.json');

type YieldRangeKey = 'S1-0' | 'S1-1' | 'S2' | 'S3' | 'N';

/**
 * Certaines cultures ont plusieurs entrées dans le tableau 7 (ex. palmier : régimes, huile
 * de péricarpe, palmistes) : toutes sont affichées, jamais une seule choisie arbitrairement.
 */
const CROP_TO_YIELD_ENTRY_CODES: Record<string, string[]> = {
  oil_palm: ['oil_palm_bunches', 'oil_palm_pericarp_oil', 'oil_palm_kernels'],
  plantain: ['banana'],
  cassava: ['cassava'],
  pineapple: ['pineapple'],
  bambara_groundnut: ['bambara_groundnut'],
};

/** Classes intermédiaires → classe la plus basse des deux (§8.2, method.json [À CONFIRMER]). */
export function toYieldRangeKey(classe: FinalClass): YieldRangeKey {
  if (classe === 'N1' || classe === 'N2') return 'N';
  if (!classe.includes('/')) return classe as YieldRangeKey;
  if (classe === 'S3/N') return 'N';
  if (classe === 'S1-0/1') return 'S1-1';
  if (classe === 'S1-1/S2') return 'S2';
  if (classe === 'S2/S3') return 'S3';
  return 'S3';
}

export interface YieldEntryLookup {
  cropCode: string;
  cropLabel: string;
  unit: string;
  rangeHighInputTPerHa: [number, number] | null;
  source: string;
  confidence: string;
}

export interface YieldLookup {
  entries: YieldEntryLookup[];
  isDataMissing: boolean;
  trace: string[];
}

export function lookupHighInputYield(cropCode: string, classe: FinalClass): YieldLookup {
  const key = toYieldRangeKey(classe);
  const trace: string[] = [`Classe ${classe} → clé du tableau 7 : ${key} (${methodConfig.intermediateClassYieldRule.strategie})`];

  const entryCodes = CROP_TO_YIELD_ENTRY_CODES[cropCode];
  if (!entryCodes) {
    trace.push(`Culture "${cropCode}" non rattachée au tableau 7`);
    return { entries: [], isDataMissing: true, trace };
  }

  const entries: YieldEntryLookup[] = [];
  for (const entryCode of entryCodes) {
    const entry = yieldTable.entries.find((e) => e.cropCode === entryCode);
    if (!entry) {
      trace.push(`Entrée "${entryCode}" introuvable dans le tableau 7`);
      continue;
    }
    const range = (entry.range as Record<string, [number, number]>)[key] ?? null;
    entries.push({
      cropCode: entry.cropCode,
      cropLabel: entry.cropLabel,
      unit: entry.unit,
      rangeHighInputTPerHa: range,
      source: entry.source,
      confidence: entry.confidence,
    });
  }

  return { entries, isDataMissing: entries.length === 0 || entries.every((e) => e.rangeHighInputTPerHa === null), trace };
}
