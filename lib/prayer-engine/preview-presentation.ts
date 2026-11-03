import type { PrayerScheduleDiff } from "./generate";
import type { PrayerKey } from "./types";

const PRAYER_KEYS: readonly PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const COLUMNS = [
  "date",
  "status",
  ...PRAYER_KEYS.flatMap((key) => [`${key}_before`, `${key}_after`]),
  "changed_prayers",
];

function csvSafe(value: string): string {
  // All production values are ISO dates, HH:mm or internal prayer labels.
  // Still neutralize a malformed value from historical data when opened in
  // spreadsheet software. This is a review export, never an input/import.
  const normalized = value.replace(/[\r\n]/g, " ");
  const neutralized = /^[\s]*[=+@\-]/.test(normalized) ? `'${normalized}` : normalized;
  return /[,"]/.test(neutralized)
    ? `"${neutralized.replaceAll('"', '""')}"`
    : neutralized;
}

/**
 * Exports the COMPLETE generated future-schedule diff for human review.
 * Never stores or changes prayer times, and deliberately has no Sahur field.
 */
export function buildRecalculationCsv(preview: PrayerScheduleDiff): string {
  const lines = [COLUMNS.join(",")];
  for (const row of preview.rows) {
    const status = row.previous === null
      ? "new"
      : row.changedPrayers.length > 0
        ? "changed"
        : "unchanged";
    const values = [
      row.date,
      status,
      ...PRAYER_KEYS.flatMap((key) => [
        row.previous?.[key] ?? "",
        row.next[key],
      ]),
      row.changedPrayers.join("|"),
    ];
    lines.push(values.map(csvSafe).join(","));
  }
  return lines.join("\n") + "\n";
}
