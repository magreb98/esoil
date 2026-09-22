/** Contrôles automatiques à l'import (§10.1). */
import type { Horizon, Profile } from '../domain/types';
import { baseSaturationPct } from '../soil/cecClay';

export type QualityIssueSeverity = 'erreur' | 'avertissement';

export interface QualityIssue {
  severity: QualityIssueSeverity;
  horizonCode?: string;
  message: string;
}

export function checkTextureSum(h: Horizon): QualityIssue | null {
  const sum = h.sandPct + h.siltPct + h.clayPct;
  if (Math.abs(sum - 100) > 1) {
    return { severity: 'erreur', horizonCode: h.code, message: `Somme sable+limon+argile = ${sum.toFixed(1)}% (attendu 100 ± 1%)` };
  }
  return null;
}

export function checkBaseSaturationConsistency(h: Horizon): QualityIssue | null {
  const sbe = h.exchCa + h.exchMg + h.exchK + h.exchNa;
  if (sbe > h.cec + 0.01) {
    return { severity: 'erreur', horizonCode: h.code, message: `SBE (${sbe.toFixed(2)}) > CEC (${h.cec.toFixed(2)}) — incohérent` };
  }
  return null;
}

export function checkHorizonContinuity(horizons: Horizon[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const sorted = [...horizons].sort((a, b) => a.topCm - b.topCm);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    if (next.topCm > current.bottomCm) {
      issues.push({ severity: 'erreur', message: `Trou entre ${current.code} (fin ${current.bottomCm}cm) et ${next.code} (début ${next.topCm}cm)` });
    } else if (next.topCm < current.bottomCm) {
      issues.push({ severity: 'erreur', message: `Chevauchement entre ${current.code} (fin ${current.bottomCm}cm) et ${next.code} (début ${next.topCm}cm)` });
    }
  }
  return issues;
}

export function checkGpsPlausibility(latitude: number, longitude: number): QualityIssue | null {
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { severity: 'erreur', message: `Coordonnées GPS hors plage valide (lat ${latitude}, lon ${longitude})` };
  }
  return null;
}

/**
 * Détecte un point aberrant par rapport au site (ex. mémoire GWETH, annexe 18 : un
 * sondage à 10°29' au lieu de 10°39', soit 10' ≈ 0,17° ≈ 18km d'écart pour un point du
 * même layon). Seuil par défaut 0,05° (~5,5km) : attrape ce type d'erreur de minute tout
 * en laissant une marge pour un site réellement étendu.
 */
export function checkGpsConsistencyWithSite(
  profile: { latitude: number; longitude: number },
  site: { latitude: number; longitude: number },
  thresholdDeg = 0.05
): QualityIssue | null {
  const dLat = Math.abs(profile.latitude - site.latitude);
  const dLon = Math.abs(profile.longitude - site.longitude);
  if (dLat > thresholdDeg || dLon > thresholdDeg) {
    return {
      severity: 'avertissement',
      message: `Coordonnées du profil éloignées de celles du site (Δlat ${dLat.toFixed(3)}°, Δlon ${dLon.toFixed(3)}°) — vérifier une éventuelle erreur de saisie (ex. minute/seconde inversée, cf. mémoire annexe 18)`,
    };
  }
  return null;
}

/** L'azote total est normalement exprimé en % (0-1 typiquement) ; une valeur élevée suggère une confusion avec g/kg (§10.1). */
export function checkNitrogenUnitPlausibility(h: Horizon): QualityIssue | null {
  if (h.totalNitrogenPct !== undefined && h.totalNitrogenPct > 1) {
    return {
      severity: 'avertissement',
      horizonCode: h.code,
      message: `Azote total = ${h.totalNitrogenPct}% — valeur inhabituellement élevée pour un %, vérifier une confusion possible avec g/kg`,
    };
  }
  return null;
}

export function runProfileQualityChecks(
  profile: Pick<Profile, 'horizons' | 'latitude' | 'longitude'>,
  site?: { latitude: number; longitude: number }
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const h of profile.horizons) {
    const t = checkTextureSum(h);
    if (t) issues.push(t);
    const b = checkBaseSaturationConsistency(h);
    if (b) issues.push(b);
    const n = checkNitrogenUnitPlausibility(h);
    if (n) issues.push(n);
  }
  issues.push(...checkHorizonContinuity(profile.horizons));
  const gps = checkGpsPlausibility(profile.latitude, profile.longitude);
  if (gps) issues.push(gps);
  if (site) {
    const gpsConsistency = checkGpsConsistencyWithSite(profile, site);
    if (gpsConsistency) issues.push(gpsConsistency);
  }
  return issues;
}

export function recomputedBaseSaturation(h: Horizon): number {
  return baseSaturationPct(h);
}
