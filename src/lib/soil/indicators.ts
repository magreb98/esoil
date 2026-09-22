/**
 * Indicateurs de fertilité — interprétation uniquement (§4.4), n'entre jamais dans le calcul d'aptitude.
 */
import type { Horizon } from '../domain/types';
import fertilityConfig from '../../config/fertility-appreciation.json';
import { baseSaturationPct } from './cecClay';

interface Band {
  max: number;
  appreciation: string;
}

function appreciate(bands: Band[], value: number): string {
  const sorted = [...bands].sort((a, b) => a.max - b.max);
  const band = sorted.find((b) => value <= b.max);
  return band ? band.appreciation : sorted[sorted.length - 1]!.appreciation;
}

export interface FertilityIndicators {
  organicMatterPct: number;
  sbe: number;
  baseSaturationPct: number;
  cnRatio: number | null;
  appreciations: {
    phWater: string;
    organicCarbon: string;
    cnRatio: string | null;
    totalNitrogen: string | null;
    assimilableP: string | null;
    organicMatter: string;
    baseSaturation: string;
  };
  verificationStatus: string;
}

export function computeFertilityIndicators(h: Horizon): FertilityIndicators {
  const organicMatterPct = h.organicCarbonPct * 1.724;
  const sbe = h.exchCa + h.exchMg + h.exchK + h.exchNa;
  const bs = baseSaturationPct(h);
  const cnRatio = h.totalNitrogenPct && h.totalNitrogenPct > 0 ? h.organicCarbonPct / h.totalNitrogenPct : null;

  return {
    organicMatterPct,
    sbe,
    baseSaturationPct: bs,
    cnRatio,
    appreciations: {
      phWater: appreciate(fertilityConfig.phWater.bands, h.phWater),
      organicCarbon: appreciate(fertilityConfig.organicCarbonPct.bands, h.organicCarbonPct),
      cnRatio: cnRatio !== null ? appreciate(fertilityConfig.cnRatio.bands, cnRatio) : null,
      totalNitrogen: h.totalNitrogenPct !== undefined ? appreciate(fertilityConfig.totalNitrogenPct.bands, h.totalNitrogenPct) : null,
      assimilableP: h.assimilablePppm !== undefined ? appreciate(fertilityConfig.assimilablePBrayIIppm.bands, h.assimilablePppm) : null,
      organicMatter: appreciate(fertilityConfig.organicMatterPct.bands, organicMatterPct),
      baseSaturation: appreciate(fertilityConfig.baseSaturationPct.bands, bs),
    },
    verificationStatus: fertilityConfig.verificationStatus,
  };
}
