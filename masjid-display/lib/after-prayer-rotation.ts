import type { DisplayAzkarDto } from "./feed-types";

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

/** Long Qur'an passages need separate Arabic and German reading pages. */
export function needsSeparatedDhikr(item: DisplayAzkarDto): boolean {
  return item.arabicText.length > 240 || item.translationDe.length > 320;
}

/** Wrap complete text on word boundaries so no slide silently cuts off a verse. */
export function paginateDhikrText(raw: string, maxChars: number): string[] {
  const limit = Math.max(40, Math.floor(maxChars));
  const words = raw.trim().split(/\s+/u).filter(Boolean);
  const pages: string[] = [];
  let current = "";

  for (const original of words) {
    let word = original;
    while (word.length > limit) {
      if (current) {
        pages.push(current);
        current = "";
      }
      pages.push(word.slice(0, limit));
      word = word.slice(limit);
    }
    if (!word) continue;
    if (current && current.length + 1 + word.length > limit) {
      pages.push(current);
      current = "";
    }
    current = current ? `${current} ${word}` : word;
  }
  if (current) pages.push(current);
  return pages;
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
  pageIndex: number;
  pageCount: number;
  textAr: string | null;
  textDe: string | null;
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

    const shared = { item, index, count: items.length };
    if (!needsSeparatedDhikr(item)) {
      return {
        ...shared, language: "both", pageIndex: 0, pageCount: 1,
        textAr: item.arabicText, textDe: item.translationDe, endsAtMs: end,
      };
    }

    const arabicPages = paginateDhikrText(item.arabicText, 170);
    const germanPages = paginateDhikrText(item.translationDe, 260);
    const reading = languageReadingSeconds(item);
    const totalReading = reading.arabic + reading.german;
    const estimatedArabicMs = Math.round(durationMs * reading.arabic / Math.max(1, totalReading) / 1_000) * 1_000;
    const arabicBudgetMs = Math.max(1_000, Math.min(durationMs - 1_000, estimatedArabicMs));
    const arabicEndMs = itemStartMs + arabicBudgetMs;

    if (nowMs < arabicEndMs && arabicPages.length > 0) {
      const elapsed = nowMs - itemStartMs;
      const localIndex = Math.min(arabicPages.length - 1, Math.floor(elapsed * arabicPages.length / arabicBudgetMs));
      const pageEndsAtMs = itemStartMs + Math.ceil((localIndex + 1) * arabicBudgetMs / arabicPages.length);
      return {
        ...shared, language: "ar", pageIndex: localIndex,
        pageCount: arabicPages.length + germanPages.length,
        textAr: arabicPages[localIndex], textDe: null, endsAtMs: pageEndsAtMs,
      };
    }

    if (germanPages.length > 0) {
      const germanStartMs = arabicEndMs;
      const germanDurationMs = end - germanStartMs;
      const localIndex = Math.min(germanPages.length - 1, Math.max(0,
        Math.floor((nowMs - germanStartMs) * germanPages.length / Math.max(1, germanDurationMs)),
      ));
      const pageEndsAtMs = germanStartMs + Math.ceil((localIndex + 1) * germanDurationMs / germanPages.length);
      return {
        ...shared, language: "de", pageIndex: arabicPages.length + localIndex,
        pageCount: arabicPages.length + germanPages.length,
        textAr: null, textDe: germanPages[localIndex], endsAtMs: pageEndsAtMs,
      };
    }
    return null;
  }
  return null;
}
