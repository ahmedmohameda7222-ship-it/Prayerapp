import type { DisplayAzkarDto } from "./feed-types";

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

/** Long Qur'an passages need separate Arabic and German reading pages. */
export function needsSeparatedDhikr(item: DisplayAzkarDto): boolean {
  return item.arabicText.length > 240 || item.translationDe.length > 320;
}

function languageReadingSeconds(item: DisplayAzkarDto) {
  return {
    arabic: wordCount(item.arabicText) / 1.6,
    german: wordCount(item.translationDe) / 2,
  };
}

/**
 * Source-ordered dhikr reading duration. Short bilingual slides can be read
 * side by side; long slides give each language its own time. Repetitions
 * receive additional time instead of a fixed four-minute global timeout.
 */
export function durationForDhikr(item: DisplayAzkarDto): number {
  const reading = languageReadingSeconds(item);
  const readingSeconds = Math.ceil(needsSeparatedDhikr(item)
    ? reading.arabic + reading.german
    : Math.max(reading.arabic, reading.german));
  const repeats = Number.isFinite(item.repeatCount)
    ? Math.max(1, Math.min(33, Math.floor(item.repeatCount)))
    : 1;
  return Math.max(18_000, Math.min(180_000, (8 + readingSeconds + 2 * repeats) * 1_000));
}

export function afterPrayerTotalMs(items: readonly DisplayAzkarDto[]): number {
  return items.reduce((total, item) => total + durationForDhikr(item), 0);
}

export interface AfterPrayerSlide {
  item: DisplayAzkarDto;
  index: number;
  count: number;
  language: "both" | "ar" | "de";
  endsAtMs: number;
}

/** Absolute-time resolution survives sleep, refresh and late joining without resetting a dhikr. */
export function activeAfterPrayerSlide(
  items: readonly DisplayAzkarDto[],
  startMs: number,
  nowMs: number,
): AfterPrayerSlide | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs) || nowMs < startMs) return null;
  let end = startMs;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const itemStartMs = end;
    const durationMs = durationForDhikr(item);
    end += durationMs;
    if (nowMs >= end) continue;

    if (needsSeparatedDhikr(item)) {
      const reading = languageReadingSeconds(item);
      const totalReading = reading.arabic + reading.german;
      const estimatedArabicMs = Math.round(durationMs * reading.arabic / Math.max(1, totalReading) / 1_000) * 1_000;
      const arabicEndsAtMs = itemStartMs + Math.max(1_000, Math.min(durationMs - 1_000, estimatedArabicMs));
      return nowMs < arabicEndsAtMs
        ? { item, index, count: items.length, language: "ar", endsAtMs: arabicEndsAtMs }
        : { item, index, count: items.length, language: "de", endsAtMs: end };
    }

    return { item, index, count: items.length, language: "both", endsAtMs: end };
  }
  return null;
}
