import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "./feed-types";
import { selectedPostPrayerAzkar } from "./post-prayer-selection";

/**
 * Presentation reading time only, not the prayer schedule.
 * Each complete Arabic dhikr and its full German translation share ONE slide,
 * including Quran verses. Never paginate, truncate or change sacred text.
 */
const ARABIC_WORD_MS = 700;
const GERMAN_WORD_MS = 450;
const ORIENTATION_MS = 4_000;
const MIN_SLIDE_MS = 9_000;

export interface PostPrayerSlide {
  itemId: string;
  arabicText: string | null;
  translationDe: string | null;
  source: string;
  repeatCount: number;
  language: "ar" | "de" | "both";
  durationMs: number;
}

export interface PostPrayerPlaylist {
  slides: PostPrayerSlide[];
  totalMs: number;
}

function words(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function estimatePostPrayerSlideMs(
  arabicText: string | null,
  translationDe: string | null,
  repeatCount: number,
): number {
  const repetitions = Number.isFinite(repeatCount) ? Math.max(1, Math.floor(repeatCount)) : 1;
  const raw = ORIENTATION_MS +
    (arabicText ? words(arabicText) * ARABIC_WORD_MS * repetitions : 0) +
    (translationDe ? words(translationDe) * GERMAN_WORD_MS : 0);
  return Math.max(MIN_SLIDE_MS, Math.ceil(raw / 1_000) * 1_000);
}

const cache = new WeakMap<MasjidDisplayFeedV1, Partial<Record<DisplayPrayerName, PostPrayerPlaylist>>>();

export function getPostPrayerPlaylist(
  feed: MasjidDisplayFeedV1,
  prayer: DisplayPrayerName,
): PostPrayerPlaylist {
  const entries = cache.get(feed);
  if (entries?.[prayer]) return entries[prayer];

  const slides: PostPrayerSlide[] = [];
  for (const item of selectedPostPrayerAzkar(feed, prayer)) {
    const arabic = item.arabicText.trim();
    const german = item.translationDe.trim();
    if (!arabic || !german) continue;
    slides.push({
      itemId: item.id,
      arabicText: arabic,
      translationDe: german,
      source: item.source,
      repeatCount: item.repeatCount,
      language: "both",
      durationMs: estimatePostPrayerSlideMs(arabic, german, item.repeatCount),
    });
  }

  const playlist: PostPrayerPlaylist = {
    slides,
    totalMs: slides.reduce((total, slide) => total + slide.durationMs, 0),
  };
  const next = entries ?? {};
  next[prayer] = playlist;
  if (!entries) cache.set(feed, next);
  return playlist;
}

export function postPrayerSlideAt(
  playlist: PostPrayerPlaylist,
  elapsedMs: number,
): { slide: PostPrayerSlide; index: number; remainingMs: number } | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= playlist.totalMs) return null;
  let offsetMs = 0;
  for (const [index, slide] of playlist.slides.entries()) {
    offsetMs += slide.durationMs;
    if (elapsedMs < offsetMs) {
      return { slide, index, remainingMs: offsetMs - elapsedMs };
    }
  }
  return null;
}
