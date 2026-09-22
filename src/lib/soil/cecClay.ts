/** CEC de l'argile, calculée à 50cm de profondeur (§4.2). */
import type { Horizon, Profile } from '../domain/types';
import { horizonAtDepth } from './aggregation';
import methodConfig from '../../config/method.json';

export interface CecClayResult {
  value: number | null;
  horizonUsed: string | null;
  trace: string[];
}

/**
 * CEC_argile = (CEC − 2 × %CO) × 100 / %argile, sur l'horizon couvrant 50cm de profondeur.
 */
export function computeCecClay(profile: Pick<Profile, 'horizons'>): CecClayResult {
  const atCm = methodConfig.fixedDepthRules.cecClay.atCm;
  const horizon = horizonAtDepth(profile.horizons, atCm);
  const trace: string[] = [`CEC de l'argile — horizon couvrant ${atCm}cm de profondeur`];

  if (!horizon) {
    trace.push('Aucun horizon disponible');
    return { value: null, horizonUsed: null, trace };
  }
  trace.push(`Horizon retenu : ${horizon.code} (${horizon.topCm}-${horizon.bottomCm}cm)`);

  if (horizon.clayPct <= 0) {
    trace.push('% argile nul ou négatif — CEC argile non calculable');
    return { value: null, horizonUsed: horizon.code, trace };
  }

  const value = ((horizon.cec - 2 * horizon.organicCarbonPct) * 100) / horizon.clayPct;
  trace.push(
    `CEC_argile = (${horizon.cec} − 2×${horizon.organicCarbonPct}) × 100 / ${horizon.clayPct} = ${value.toFixed(3)} cmol(+)/kg`
  );
  return { value, horizonUsed: horizon.code, trace };
}

export function baseSaturationPct(h: Horizon): number {
  const sbe = h.exchCa + h.exchMg + h.exchK + h.exchNa;
  return h.cec > 0 ? (sbe / h.cec) * 100 : 0;
}

export function espPct(h: Horizon): number {
  return h.cec > 0 ? (h.exchNa / h.cec) * 100 : 0;
}
