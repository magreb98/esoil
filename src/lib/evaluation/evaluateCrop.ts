/**
 * Point d'entrée : évalue une culture contre un profil et une série climatique, avec les
 * trois méthodes (§7), la notation finale (§7.4) et la liste des critères non évaluables
 * faute de données ou de règle confirmée (jamais un calcul silencieux, §12).
 */
import type { ClimateSeries, CriterionRequirement, CropDefinition, CropEvaluation, NonEvaluatedCriterion, Profile, Site } from '../domain/types';
import { rateCriterion } from '../rating/rateCriterion';
import { resolveClimateCriterion } from './resolveClimateCriterion';
import { resolveSoilCriterion } from './resolveSoilCriterion';
import { computeLowestClass } from './lowestClass';
import { computeNumberIntensity } from './numberIntensity';
import { computeParametric } from './parametric';
import { computeFinalNotation } from './notation';
import methodConfig from '../../config/method.json';

const ROOTING_DEPTH_DEFAULTS = methodConfig.rootingDepthDefaultsCm as unknown as Record<string, number>;

/** Profondeur d'enracinement effective : celle de la culture si documentée, sinon un défaut opérationnel (method.json), jamais silencieux. */
export function effectiveRootingDepthCm(crop: Pick<CropDefinition, 'code' | 'rootingDepthCm'>): { value: number; wasDefaulted: boolean } {
  if (crop.rootingDepthCm !== null) return { value: crop.rootingDepthCm, wasDefaulted: false };
  const fallback = ROOTING_DEPTH_DEFAULTS[crop.code] ?? ROOTING_DEPTH_DEFAULTS._default ?? 100;
  return { value: fallback, wasDefaulted: true };
}

function processCriteria(
  requirements: CriterionRequirement[],
  resolve: (req: CriterionRequirement) => { value: number | string; trace: string[] } | null,
  slopeScale: 1 | 2 | 3,
  missingOut: NonEvaluatedCriterion[]
) {
  const ratings = [];
  for (const req of requirements) {
    if (req.kind === 'special_sys_cec') {
      missingOut.push({ code: req.code, label: req.label, reason: req.note ?? 'Notation Sys « (-) / (+) » non confirmée' });
      continue;
    }
    if (req.bounds === null) {
      missingOut.push({ code: req.code, label: req.label, reason: req.note ?? 'Aucune donnée de référence lisible pour ce critère' });
      continue;
    }
    const resolved = resolve(req);
    if (!resolved) {
      missingOut.push({ code: req.code, label: req.label, reason: 'Valeur non calculable à partir des données saisies' });
      continue;
    }
    const { rating, skipReason } = rateCriterion(req, resolved.value, resolved.trace, slopeScale);
    if (!rating) {
      missingOut.push({ code: req.code, label: req.label, reason: skipReason ?? 'Non évaluable' });
      continue;
    }
    ratings.push(rating);
  }
  return ratings;
}

export function evaluateCrop(profile: Profile, climateSeries: ClimateSeries, crop: CropDefinition, site: Site): CropEvaluation {
  const missingCriteria: NonEvaluatedCriterion[] = [];
  const slopeScale = site.methodParameters.defaultSlopeScale;
  const { value: rootingDepthCm } = effectiveRootingDepthCm(crop);

  const climateRatings = processCriteria(
    crop.climateRequirements,
    (req) => resolveClimateCriterion(req.code, climateSeries.months, profile.latitude, site.methodParameters.waterHoldingCapacityMm),
    slopeScale,
    missingCriteria
  );

  const soilRatings = processCriteria(
    crop.soilRequirements,
    (req) => resolveSoilCriterion(req.code, req.depthRule, profile, crop, rootingDepthCm, slopeScale),
    slopeScale,
    missingCriteria
  );

  const allRatings = [...climateRatings, ...soilRatings];
  const lowestClass = computeLowestClass(allRatings);
  const numberIntensity = computeNumberIntensity(climateRatings, soilRatings);
  const parametric = computeParametric(climateRatings, soilRatings);
  const { finalNotation, methodsAgree } = computeFinalNotation(lowestClass, numberIntensity, parametric);

  return {
    cropCode: crop.code,
    profileId: profile.id,
    climateSeriesId: climateSeries.id,
    computedAt: new Date().toISOString(),
    soilRatings,
    climateRatings,
    lowestClass,
    numberIntensity,
    parametric,
    finalNotation,
    methodsAgree,
    missingCriteria,
  };
}
