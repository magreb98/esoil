/**
 * Durée astronomique du jour (N) à une latitude donnée — formule astronomique standard,
 * vérifiée contre la table 5 du manuel. Utilisée par Thornthwaite (§5.1).
 */

const DAY_OF_YEAR_MID_MONTH = [15, 45, 74, 105, 135, 162, 198, 228, 259, 289, 320, 350];

export function solarDeclinationDeg(dayOfYear: number): number {
  return 23.45 * Math.sin(((2 * Math.PI) / 365) * (284 + dayOfYear));
}

/** Durée du jour en heures, pour une latitude (degrés, + = Nord) et un jour de l'année (1-365). */
export function dayLengthHours(latitudeDeg: number, dayOfYear: number): number {
  const latRad = (latitudeDeg * Math.PI) / 180;
  const declRad = (solarDeclinationDeg(dayOfYear) * Math.PI) / 180;
  const cosH = -Math.tan(latRad) * Math.tan(declRad);
  const clamped = Math.max(-1, Math.min(1, cosH));
  const hourAngle = Math.acos(clamped);
  return (24 / Math.PI) * hourAngle;
}

/** Durée moyenne du jour (heures) pour le mois (1-12), calculée au 15/45/74... jour de l'année. */
export function monthlyDayLengthHours(latitudeDeg: number, month: number): number {
  const doy = DAY_OF_YEAR_MID_MONTH[month - 1] ?? 182;
  return dayLengthHours(latitudeDeg, doy);
}
