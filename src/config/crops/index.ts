/**
 * Registre des cultures — chargé et validé depuis le paquet de données de référence
 * (`src/config/reference/`, voir son README.md). Toute anomalie de structure lève une
 * erreur lisible au chargement plutôt que d'être ignorée.
 */
import type { CropDefinition } from '../../lib/domain/types';
import { cropReferenceSchema, parseReferenceFile } from '../../lib/domain/referenceSchema';
import oilPalmRaw from '../reference/crops/oil-palm.json';
import plantainRaw from '../reference/crops/plantain.json';
import cassavaRaw from '../reference/crops/cassava.json';
import pineappleRaw from '../reference/crops/pineapple.json';
import bambaraGroundnutRaw from '../reference/crops/bambara-groundnut.json';

function loadCrop(raw: unknown, fileLabel: string): CropDefinition {
  const parsed = parseReferenceFile(cropReferenceSchema, raw, fileLabel);
  return {
    code: parsed.code,
    name: parsed.name,
    scientificName: parsed.scientificName,
    lifecycle: parsed.lifecycle,
    rootingDepthCm: parsed.rootingDepthCm ?? null,
    correctionFactorGroup: parsed.correctionFactorGroup,
    source: parsed.source,
    verificationStatus: parsed.verificationStatus,
    climateRequirements: parsed.climateRequirements as CropDefinition['climateRequirements'],
    soilRequirements: parsed.soilRequirements as CropDefinition['soilRequirements'],
    note: parsed.note,
    conventions: parsed.conventions,
  };
}

export const CROPS: CropDefinition[] = [
  loadCrop(oilPalmRaw, 'reference/crops/oil-palm.json'),
  loadCrop(plantainRaw, 'reference/crops/plantain.json'),
  loadCrop(cassavaRaw, 'reference/crops/cassava.json'),
  loadCrop(pineappleRaw, 'reference/crops/pineapple.json'),
  loadCrop(bambaraGroundnutRaw, 'reference/crops/bambara-groundnut.json'),
];

export function getCrop(code: string): CropDefinition | undefined {
  return CROPS.find((c) => c.code === code);
}

export function isCropEvaluable(crop: CropDefinition): boolean {
  return crop.climateRequirements.length > 0 || crop.soilRequirements.length > 0;
}
