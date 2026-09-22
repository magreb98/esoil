/**
 * Résout la « valeur retenue » d'un critère de sol : soit un champ du profil (pente,
 * inondation, drainage, profondeur, texture), soit une valeur de laboratoire agrégée selon
 * sa règle de profondeur (§4, method-formulas.md §4 du paquet de référence).
 */
import type { CropDefinition, DepthRuleCode, Horizon, Profile } from '../domain/types';
import { weightedSliceAverage, fixedDepthAverage, fixedDepthMax } from '../soil/aggregation';
import { baseSaturationPct, espPct } from '../soil/cecClay';
import { classifyTexture } from '../soil/texture';

export interface ResolvedSoilValue {
  value: number | string;
  trace: string[];
}

const PROFILE_LEVEL_CODES = new Set(['pente', 'inondation', 'drainage', 'profondeur_sol', 'texture']);

export function isProfileLevelCriterion(code: string): boolean {
  return PROFILE_LEVEL_CODES.has(code);
}

const HORIZON_PROPERTY_GETTERS: Record<string, (h: Horizon) => number> = {
  caco3: (h) => h.caco3Pct ?? 0,
  gypse: (h) => h.gypsumPct ?? 0,
  saturation_bases: baseSaturationPct,
  carbone_organique: (h) => h.organicCarbonPct,
  ph: (h) => h.phWater,
  ece: (h) => h.ece ?? 0,
  esp: espPct,
  elements_grossiers: (h) => h.coarseFragmentsPct ?? 0,
  elements_grossiers_surface: (h) => h.coarseFragmentsPct ?? 0,
};

function firstHorizon(horizons: Horizon[]): Horizon | undefined {
  return [...horizons].sort((a, b) => a.topCm - b.topCm)[0];
}

function resolveByDepthRule(
  code: string,
  depthRule: DepthRuleCode,
  profile: Pick<Profile, 'horizons' | 'effectiveDepthCm'>,
  crop: Pick<CropDefinition, 'lifecycle' | 'rootingDepthCm'>,
  effectiveRootingDepthCm: number
): ResolvedSoilValue | null {
  const getter = HORIZON_PROPERTY_GETTERS[code];
  if (!getter) return null;

  switch (depthRule) {
    case 'surface': {
      const h = firstHorizon(profile.horizons);
      if (!h) return null;
      return { value: getter(h), trace: [`${code} — valeur de surface (horizon ${h.code}, ${h.topCm}-${h.bottomCm}cm)`] };
    }
    case '0_15cm': {
      const r = fixedDepthAverage(profile.horizons, getter, 0, 15, code);
      return { value: r.value, trace: r.trace };
    }
    case '0_30cm': {
      const r = fixedDepthAverage(profile.horizons, getter, 0, 30, code);
      return { value: r.value, trace: r.trace };
    }
    case 'moyenne_0_100': {
      const r = fixedDepthAverage(profile.horizons, getter, 0, 100, code);
      return { value: r.value, trace: r.trace };
    }
    case 'max_0_100': {
      const r = fixedDepthMax(profile.horizons, getter, 0, 100, code);
      return { value: r.value, trace: r.trace };
    }
    case 'ponderation_25cm': {
      const r = weightedSliceAverage(profile, getter, crop.lifecycle, effectiveRootingDepthCm, code);
      return { value: r.value, trace: r.trace };
    }
    case 'a_50cm':
      // Uniquement `cec_argile` (special_sys_cec) utilise cette règle : toujours non évaluable en amont (rateCriterion).
      return null;
    default:
      return null;
  }
}

export function resolveSoilCriterion(
  code: string,
  depthRule: DepthRuleCode | undefined,
  profile: Profile,
  crop: Pick<CropDefinition, 'lifecycle' | 'rootingDepthCm'>,
  effectiveRootingDepthCm: number,
  defaultSlopeScale: 1 | 2 | 3
): ResolvedSoilValue | null {
  switch (code) {
    case 'pente':
      return { value: profile.slopePct, trace: [`Pente — valeur du profil (échelle ${defaultSlopeScale})`] };
    case 'inondation':
      return { value: profile.floodingClass, trace: ['Inondation — classe du profil'] };
    case 'drainage':
      return { value: profile.drainageClass, trace: ['Drainage — classe du profil'] };
    case 'profondeur_sol':
      return { value: profile.effectiveDepthCm, trace: ['Profondeur du sol — profondeur effective du profil'] };
    case 'texture': {
      const sand = weightedSliceAverage(profile, (h) => h.sandPct, crop.lifecycle, effectiveRootingDepthCm, 'Sable');
      const silt = weightedSliceAverage(profile, (h) => h.siltPct, crop.lifecycle, effectiveRootingDepthCm, 'Limon');
      const clay = weightedSliceAverage(profile, (h) => h.clayPct, crop.lifecycle, effectiveRootingDepthCm, 'Argile');
      const texture = classifyTexture(sand.value, silt.value, clay.value, firstHorizon(profile.horizons)?.structure);
      return { value: texture.sysCode, trace: [`Texture Sys (pondérée par tranches de 25cm) : ${texture.sysCode}`, ...texture.trace] };
    }
    default:
      return resolveByDepthRule(code, depthRule ?? 'surface', profile, crop, effectiveRootingDepthCm);
  }
}
