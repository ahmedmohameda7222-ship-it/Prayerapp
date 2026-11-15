import type { DisplayAzkarDto } from "./feed-types";

/**
 * One source-ordered after-prayer dhikr occupies a full-screen reading slide.
 * The two languages are read together (not added); repetitions add recitation
 * time. A 33x item therefore stays materially longer than a single item.
 */
export function durationForDhikr(item: DisplayAzkarDto): number {
  const words = (value: string) => value.trim().split(/\s+/u).filter(Boolean).length;
  const readingSeconds = Math.ceil(Math.max(
    words(item.arabicText) / 1.6, words(item.translationDe) / 2,
  ));
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
  endsAtMs: number;
}

/** Pure absolute-time lookup: TV wake/reload will never reset the slide. */
export function activeAfterPrayerSlide(
  items: readonly DisplayAzkarDto[],
  startMs: number,
  nowMs: number,
): AfterPrayerSlide | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs) || nowMs < startMs) return null;
  let end = startMs;
  for (let index = 0; index < items.length; index += 1) {
    end += durationForDhikr(items[index]);
    if (nowMs < end) return { item: items[index], index, count: items.length, endsAtMs: end };
  }
  return null;
}
