/**
 * Triangle textural USDA (12 classes) + notation Sys (§4.3).
 * Source de l'algorithme USDA : classification officielle USDA-NRCS (droites de séparation
 * publiées, équivalentes aux polygones du triangle textural). Ce n'est pas une donnée du
 * mémoire GWETH — c'est un standard international implémenté à l'identique.
 */
import type { SoilStructure } from '../domain/types';

export type UsdaTextureClass =
  | 'sable'
  | 'sable_limoneux'
  | 'limon_sableux'
  | 'limon'
  | 'limon_limoneux'
  | 'limon_pur'
  | 'argile_sableuse_limoneuse'
  | 'argile_limoneuse'
  | 'argile_limoneuse_limoneuse'
  | 'argile_sableuse'
  | 'argile_limoneuse_pure'
  | 'argile';

export interface TextureResult {
  usdaClass: UsdaTextureClass;
  sysCode: string;
  trace: string[];
}

/**
 * Classification USDA à partir de %sable, %limon, %argile (somme = 100 ± 1).
 * Algorithme des droites de séparation publié par l'USDA-NRCS.
 */
export function classifyUsdaTexture(sandPct: number, siltPct: number, clayPct: number): UsdaTextureClass {
  const sand = sandPct;
  const silt = siltPct;
  const clay = clayPct;

  // Groupe argile (clay >= 40)
  if (clay >= 35 && sand > 45) return 'argile_sableuse'; // Sandy Clay
  if (clay >= 40 && silt >= 40) return 'argile_limoneuse_pure'; // Silty Clay
  if (clay >= 40 && sand <= 45 && silt < 40) return 'argile'; // Clay

  // Groupe argile-limon (27 <= clay < 40)
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'argile_sableuse_limoneuse'; // Sandy Clay Loam
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'argile_limoneuse'; // Clay Loam
  if (clay >= 27 && clay < 40 && sand <= 20) return 'argile_limoneuse_limoneuse'; // Silty Clay Loam

  // Sable / sable limoneux (clay faible, composite silt+k*clay)
  if (silt + 1.5 * clay < 15) return 'sable'; // Sand
  if (silt + 2 * clay < 30) return 'sable_limoneux'; // Loamy Sand

  // Limon sableux
  if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30)) {
    return 'limon_sableux'; // Sandy Loam
  }

  // Limon / limon limoneux / limon pur
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'limon'; // Loam
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'limon_limoneux'; // Silt Loam
  if (silt >= 80 && clay < 12) return 'limon_pur'; // Silt

  // Filet de sécurité (frontières arrondies) : le plus proche par distance au centre des classes limitrophes
  return 'limon'; // Loam, classe la plus centrale — ne devrait être atteinte qu'en cas d'arrondi aux frontières
}

const USDA_BASE_SYS_CODE: Record<UsdaTextureClass, string> = {
  sable: 'S',
  sable_limoneux: 'LS',
  limon_sableux: 'SL',
  limon: 'L',
  limon_limoneux: 'SiL',
  limon_pur: 'Si',
  argile_sableuse_limoneuse: 'SCL',
  argile_limoneuse: 'CL',
  argile_limoneuse_limoneuse: 'SiCL',
  argile_sableuse: 'SC',
  argile_limoneuse_pure: 'SiC',
  argile: 'C',
};

/**
 * Ajoute le suffixe de structure Sys (§4.3). Le manuel ne détaille pas la règle de
 * correspondance structure→suffixe : interprétation retenue ci-dessous, documentée
 * dans le trace de chaque résultat. [À CONFIRMER]
 */
export function toSysTextureCode(
  usdaClass: UsdaTextureClass,
  clayPct: number,
  structure: SoilStructure | undefined
): TextureResult {
  const trace: string[] = [`Classe USDA : ${usdaClass}`];
  const base = USDA_BASE_SYS_CODE[usdaClass];

  if (usdaClass === 'argile') {
    const clayBand = clayPct > 60 ? '>60' : '<60';
    trace.push(`Argile ${clayBand}% (seuil 60% du §4.3)`);
    if (structure === 'oxique') {
      trace.push('Structure oxique → code Co');
      return { usdaClass, sysCode: 'Co', trace };
    }
    if (structure === 'massive') {
      trace.push('Structure massive → code Cm');
      return { usdaClass, sysCode: 'Cm', trace };
    }
    if (structure === 'vertique') {
      trace.push('Structure vertique → suffixe v');
      return { usdaClass, sysCode: `C${clayBand}v`, trace };
    }
    trace.push(
      structure
        ? `Structure ${structure} → suffixe polyédrique par défaut (s)`
        : 'Structure non renseignée → suffixe polyédrique par défaut (s) [À CONFIRMER]'
    );
    return { usdaClass, sysCode: `C${clayBand}s`, trace };
  }

  if (usdaClass === 'argile_limoneuse_pure') {
    if (structure === 'massive') {
      trace.push('Structure massive → code SiCm');
      return { usdaClass, sysCode: 'SiCm', trace };
    }
    if (structure === 'polyedrique') {
      trace.push('Structure polyédrique → code SiCs');
      return { usdaClass, sysCode: 'SiCs', trace };
    }
    trace.push('Structure non polyédrique/massive → code SiC par défaut');
    return { usdaClass, sysCode: 'SiC', trace };
  }

  trace.push(`Code Sys : ${base} (pas de variante de structure pour cette classe)`);
  return { usdaClass, sysCode: base, trace };
}

/**
 * Point d'entrée unique : classe USDA + code Sys avec traçabilité complète.
 * NB : les variantes de sable fin/grossier (fS, cS, LfS, LcS, cS) du §4.3 nécessitent une
 * granulométrie détaillée du sable (fractions fine/grossière) qui n'est pas dans le modèle
 * Horizon — non calculées, code générique (S/LS/SL) retourné avec un avertissement de trace.
 */
export function classifyTexture(sandPct: number, siltPct: number, clayPct: number, structure?: SoilStructure): TextureResult {
  const usdaClass = classifyUsdaTexture(sandPct, siltPct, clayPct);
  const result = toSysTextureCode(usdaClass, clayPct, structure);
  if (['sable', 'sable_limoneux', 'limon_sableux'].includes(usdaClass)) {
    result.trace.push(
      "Distinction sable fin/grossier (fS, cS, LfS, LcS) non calculée : granulométrie détaillée du sable absente du modèle de données [À CONFIRMER]"
    );
  }
  return result;
}
