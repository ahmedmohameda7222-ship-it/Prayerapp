import { APP_TIME_ZONE } from "@/lib/date-utils";
import type { AzkarCategory } from "@/lib/types";

function mosqueClock(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    weekday: parts.weekday,
    hour: Number(parts.hour),
  };
}

export function smartAzkarCategory(date: Date, timeZone = APP_TIME_ZONE): AzkarCategory {
  const { weekday, hour } = mosqueClock(date, timeZone);
  if (weekday === "Fri") return "Friday";
  if (hour >= 4 && hour < 12) return "Morning";
  if (hour >= 15 && hour < 22) return "Evening";
  if (hour >= 22 || hour < 4) return "Sleep";
  return "Morning";
}
