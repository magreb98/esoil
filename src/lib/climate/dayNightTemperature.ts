/**
 * Températures diurne et nocturne (manuel p.34, method-formulas.md §2 du paquet de données
 * de référence — fournie avec réserve sur le signe de Tnuit).
 *
 * Tjour = (Tmax+Tmin)/2 + (Tmax−Tmin)/(4π) × (46−N)/N
 * Tnuit = (Tmax+Tmin)/2 (signe) (Tmax−Tmin)/(4π) × (46−N)/(24−N)
 *
 * Le scan imprime un « + » dans la formule de Tnuit, mais cela rendrait la nuit plus chaude
 * que la moyenne journalière (physiquement impossible) : « − » est retenu par défaut,
 * configurable sans toucher au code (method.json → tnuitSigne).
 */
import methodConfig from '../../config/method.json';

export type TnuitSigne = '+' | '-';

export function getTnuitSigne(): TnuitSigne {
  return (methodConfig.tnuitSigne.signe as TnuitSigne) ?? '-';
}

export interface DayNightTemperatureResult {
  tJour: number;
  tNuit: number;
  tMoyenne: number;
  signeUtilise: TnuitSigne;
}

export function computeDayNightTemperature(tMax: number, tMin: number, daylightHoursN: number, signe: TnuitSigne = getTnuitSigne()): DayNightTemperatureResult {
  const tMoyenne = (tMax + tMin) / 2;
  const amplitude = (tMax - tMin) / (4 * Math.PI);
  const N = daylightHoursN;

  const tJour = tMoyenne + amplitude * ((46 - N) / N);
  const nightFactor = amplitude * ((46 - N) / (24 - N));
  const tNuit = signe === '-' ? tMoyenne - nightFactor : tMoyenne + nightFactor;

  return { tJour, tNuit, tMoyenne, signeUtilise: signe };
}
