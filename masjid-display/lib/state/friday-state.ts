import type { DisplayJumuahService, MasjidDisplayFeedV1 } from "../feed-types";
import { isFridayIso, localDateIso, zonedDateTime } from "../time";

const MINUTE_MS = 60_000;
const PRIMARY_FOCUS_MS = 60 * MINUTE_MS;
const ADDITIONAL_FOCUS_MS = 10 * MINUTE_MS;
const JUMUAH_HOLD_MS = 30 * MINUTE_MS;

export type FridayStateResolution =
  | { kind: "FRIDAY_MODE"; serviceId: string; serviceIndex: number }
  | { kind: "JUMUAH_NOW"; serviceId: string; serviceIndex: number };

type FridayService = DisplayJumuahService & { primary: boolean };

function servicesForDate(feed: MasjidDisplayFeedV1, date: string): FridayService[] {
  const day = feed.prayers.schedule.find((row) => row.date === date);
  if (!day || !isFridayIso(date)) return [];

  const primary: FridayService = {
    id: `primary:${date}`,
    date,
    prayerTime: day.dhuhr,
    primary: true,
  };

  const seenTimes = new Set<string>();
  const additional = feed.prayers.additionalJumuah
    .filter((service) => service.date === date && service.prayerTime > day.dhuhr)
    .sort((a, b) => a.prayerTime.localeCompare(b.prayerTime) || a.id.localeCompare(b.id))
    .filter((service) => {
      if (seenTimes.has(service.prayerTime)) return false;
      seenTimes.add(service.prayerTime);
      return true;
    })
    .map((service) => ({ ...service, primary: false }));

  return [primary, ...additional];
}

export function resolveFridayState(
  feed: MasjidDisplayFeedV1,
  logicalNow: Date,
): FridayStateResolution | null {
  const date = localDateIso(logicalNow, feed.timezone);
  const services = servicesForDate(feed, date);
  if (!services.length) return null;

  const nowMs = logicalNow.getTime();
  const instants = services.map((service) =>
    zonedDateTime(service.date, service.prayerTime, feed.timezone).getTime(),
  );

  const nextIndex = instants.findIndex((instant) => instant > nowMs);
  if (nextIndex >= 0) {
    const focusWindow = nextIndex === 0 ? PRIMARY_FOCUS_MS : ADDITIONAL_FOCUS_MS;
    if (nowMs >= instants[nextIndex] - focusWindow) {
      return {
        kind: "FRIDAY_MODE",
        serviceId: services[nextIndex].id,
        serviceIndex: nextIndex,
      };
    }
  }

  for (let index = services.length - 1; index >= 0; index -= 1) {
    if (nowMs < instants[index]) continue;

    let effectiveHoldEnd = instants[index] + JUMUAH_HOLD_MS;
    if (index + 1 < services.length) {
      effectiveHoldEnd = Math.min(
        effectiveHoldEnd,
        instants[index + 1] - ADDITIONAL_FOCUS_MS,
      );
    }

    if (nowMs < effectiveHoldEnd) {
      return {
        kind: "JUMUAH_NOW",
        serviceId: services[index].id,
        serviceIndex: index,
      };
    }
    break;
  }

  return null;
}
