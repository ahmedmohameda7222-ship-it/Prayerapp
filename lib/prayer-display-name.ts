import type { PrayerName } from "@/lib/types";
import { isFridayIso } from "@/lib/friday";

export function getPrayerDisplayNameKey(name: PrayerName, date: string) {
  return name === "dhuhr" && isFridayIso(date) ? "prayer.jumuah" : `prayer.${name}`;
}
