import type { Event } from "@/lib/types";
import { todayIso, zonedDateTime } from "@/lib/date-utils";

export function isUpcomingEvent(event: Event, now = new Date()) {
  const today = todayIso(now);
  if (event.date > today) return true;
  if (event.date < today) return false;

  const cutoffTime = event.endTime || event.startTime;
  if (!cutoffTime) return false;
  return zonedDateTime(event.date, cutoffTime).getTime() >= now.getTime();
}
