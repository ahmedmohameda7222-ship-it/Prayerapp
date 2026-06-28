export const KAABA_LAT = 21.4225;
export const KAABA_LON = 39.8262;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Convert DeviceOrientationEvent alpha into a clockwise heading from north. */
export function headingFromAlpha(alpha: number): number {
  return normalizeDegrees(360 - alpha);
}

export function calculateNeedleRotation(qiblaBearing: number, phoneHeading: number): number {
  return normalizeDegrees(qiblaBearing - phoneHeading);
}

/** Smooth a heading while taking the shortest path across the 0/360 boundary. */
export function smoothCompassHeading(
  previousHeading: number | null,
  nextHeading: number,
  smoothingFactor = 0.24
): number {
  if (previousHeading === null) return normalizeDegrees(nextHeading);

  const shortestDelta = ((nextHeading - previousHeading + 540) % 360) - 180;
  return normalizeDegrees(previousHeading + shortestDelta * smoothingFactor);
}

/**
 * Calculate the initial great-circle bearing from a given latitude/longitude
 * to the Kaaba in Mecca.
 */
export function calculateQiblaBearing(latitude: number, longitude: number): number {
  const lat1 = toRadians(latitude);
  const lat2 = toRadians(KAABA_LAT);
  const deltaLon = toRadians(KAABA_LON - longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}
