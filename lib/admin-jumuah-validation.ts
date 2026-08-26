import { isFridayIso } from "@/lib/friday";

type PrimaryPrayerAuthority = {
  date: string;
  dhuhr: string;
};

type ExistingAdditionalJumuah = {
  id: string;
  prayerTime: string;
};

export type AdditionalJumuahValidationError =
  | "invalid-date"
  | "not-friday"
  | "missing-primary"
  | "invalid-time"
  | "not-after-primary"
  | "duplicate-time";

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateAdditionalJumuah({
  date,
  prayerTime,
  primaryPrayer,
  existing,
  editingId,
}: {
  date: string;
  prayerTime: string;
  primaryPrayer?: PrimaryPrayerAuthority;
  existing: ExistingAdditionalJumuah[];
  editingId?: string;
}): AdditionalJumuahValidationError | null {
  if (!DATE_RE.test(date)) return "invalid-date";
  if (!isFridayIso(date)) return "not-friday";
  if (!primaryPrayer || primaryPrayer.date !== date) return "missing-primary";
  if (!TIME_RE.test(prayerTime) || !TIME_RE.test(primaryPrayer.dhuhr)) return "invalid-time";
  if (prayerTime <= primaryPrayer.dhuhr) return "not-after-primary";
  if (existing.some((item) => item.id !== editingId && item.prayerTime === prayerTime)) return "duplicate-time";
  return null;
}
