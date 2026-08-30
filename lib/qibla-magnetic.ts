import { model } from "geomagnetism";

/**
 * Return WMM magnetic declination in degrees for the requested location/date.
 * The package's strict model lookup is intentionally used: if no model is valid
 * for the date, the call throws and this boundary fails closed with null.
 */
export async function getMagneticDeclination(
  latitude: number,
  longitude: number,
  when: Date = new Date(),
): Promise<number | null> {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !(when instanceof Date) ||
    !Number.isFinite(when.getTime())
  ) {
    return null;
  }

  try {
    const result = model(when).point([latitude, longitude, 0]);
    return Number.isFinite(result.decl) ? result.decl : null;
  } catch {
    return null;
  }
}
