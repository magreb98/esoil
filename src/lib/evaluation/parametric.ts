/** Méthode paramétrique (§7.3, manuel p.26-27, p.35-36). */
import type { ClimateGroup, CriterionRating, FinalClass, ParametricResult } from '../domain/types';
import methodConfig from '../../config/method.json';

const CLIMATE_GROUPS: ClimateGroup[] = ['eau', 'temperature', 'humidite_air', 'insolation'];
const PH_BASE_SATURATION_CODES = new Set(['ph_water', 'ph', 'saturation_en_bases', 'base_saturation', 'saturation_bases']);

/** Produit itératif des termes (chacun 0-100) en ramenant chaque terme suivant sur 100, comme l'exemple du manuel : CI = 49 × 91/100 × 86/100 × 88/100. */
function iterativeProduct(terms: number[]): number {
  if (terms.length === 0) return 100;
  return terms.reduce((acc, t, idx) => (idx === 0 ? t : (acc * t) / 100), terms[0]!);
}

function convertCiToCr(ci: number): number {
  const cfg = methodConfig.parametricConversion;
  if (ci > cfg.ciAbove.threshold) return cfg.ciAbove.crValue;
  if (ci >= cfg.ciMid.min) return 16.67 + 0.9 * ci;
  return 1.6 * ci;
}

function classifyLandIndex(it: number, worstDegree4Ratings: CriterionRating[]): FinalClass {
  const grid = methodConfig.landIndexGrid.bands;
  for (const band of grid) {
    if (it >= band.itMin && it <= band.itMax) {
      if (band.classe === 'N1_ou_N2') {
        const allCorrectable = worstDegree4Ratings.length > 0 && worstDegree4Ratings.every((r) => r.corrigible);
        return allCorrectable ? 'N1' : 'N2';
      }
      return band.classe as FinalClass;
    }
  }
  return 'N2';
}

export function computeParametric(climateRatings: CriterionRating[], soilRatings: CriterionRating[]): ParametricResult {
  const climateGroupMinimums: ParametricResult['climateGroupMinimums'] = {};
  for (const group of CLIMATE_GROUPS) {
    const inGroup = climateRatings.filter((r) => r.climateGroup === group);
    if (inGroup.length === 0) continue;
    const min = inGroup.reduce((m, r) => (r.valeurParametrique < m.value ? { value: r.valeurParametrique, criterionCode: r.criterionCode } : m), {
      value: inGroup[0]!.valeurParametrique,
      criterionCode: inGroup[0]!.criterionCode,
    });
    climateGroupMinimums[group] = min;
  }

  const ciTerms = Object.values(climateGroupMinimums).map((m) => m!.value);
  const indiceClimatique = iterativeProduct(ciTerms);
  const tauxClimatique = convertCiToCr(indiceClimatique);

  const phOrBaseSat = soilRatings.filter((r) => PH_BASE_SATURATION_CODES.has(r.criterionCode));
  const otherSoil = soilRatings.filter((r) => !PH_BASE_SATURATION_CODES.has(r.criterionCode));

  const isTerms: number[] = otherSoil.map((r) => r.valeurParametrique);
  let phOrBaseSaturationMin: { value: number; criterionCode: string } | undefined;
  if (phOrBaseSat.length > 0) {
    phOrBaseSaturationMin = phOrBaseSat.reduce((m, r) => (r.valeurParametrique < m.value ? { value: r.valeurParametrique, criterionCode: r.criterionCode } : m), {
      value: phOrBaseSat[0]!.valeurParametrique,
      criterionCode: phOrBaseSat[0]!.criterionCode,
    });
    isTerms.push(phOrBaseSaturationMin.value);
  }
  const indiceSol = isTerms.length > 0 ? iterativeProduct(isTerms) : 100;

  const indiceTerre = (tauxClimatique * indiceSol) / 100;
  const degre4 = [...climateRatings, ...soilRatings].filter((r) => r.degre === 4);
  const classe = classifyLandIndex(indiceTerre, degre4);

  return {
    method: 'parametrique',
    indiceClimatique,
    tauxClimatique,
    indiceSol,
    indiceTerre,
    classe,
    climateGroupMinimums,
    soilIndexDetail: { includedCriteria: otherSoil.map((r) => r.criterionCode), phOrBaseSaturationMin },
  };
}
