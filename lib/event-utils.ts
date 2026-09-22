import type { Event } from "@/lib/types";
import { APP_TIME_ZONE, todayIso, zonedDateTime } from "@/lib/date-utils";

export function isUpcomingEvent(
  event: Event,
  now = new Date(),
  timeZone = APP_TIME_ZONE,
) {
  const today = todayIso(now, timeZone);
  if (event.date > today) return true;
  if (event.date < today) return false;

  const cutoffTime = event.endTime || event.startTime;
  if (!cutoffTime) return false;
  return zonedDateTime(event.date, cutoffTime, timeZone).getTime() >= now.getTime();
}
