import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "./feed-types";
import { selectedPostPrayerAzkar } from "./post-prayer-selection";

/**
 * Reading-time presentation, not religious timing: 86 Arabic words/minute,
 * 133 German words/minute, plus a 4-second visual orientation allowance.
 * 9-second minimum gives a short dhikr time to settle on a distant TV.
 */
const ARABIC_WORD_MS = 700;
const GERMAN_WORD_MS = 450;
const ORIENTATION_MS = 4_000;
const MIN_SLIDE_MS = 9_000;
const ARABIC_PAGE_CHARS = 160;
const GERMAN_PAGE_CHARS = 235;

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

/** Break at words, without dropping meaningful text or truncating a long prayer. */
function paginate(text: string, maxChars: number): string[] {
  const parts = text.trim().split(/\s+/u).filter(Boolean);
  const pages: string[] = [];
  let current = "";
  for (const original of parts) {
    let word = original;
    // A single unusually long unbroken token must never overflow the screen.
    while (word.length > maxChars) {
      if (current) { pages.push(current); current = ""; }
      pages.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!word) continue;
    if (current && current.length + 1 + word.length > maxChars) {
      pages.push(current);
      current = "";
    }
    current = current ? `${current} ${word}` : word;
  }
  if (current) pages.push(current);
  return pages;
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

    const details = { itemId: item.id, source: item.source, repeatCount: item.repeatCount };
    if (arabic.length <= ARABIC_PAGE_CHARS && german.length <= GERMAN_PAGE_CHARS) {
      slides.push({
        ...details, arabicText: arabic, translationDe: german, language: "both",
        durationMs: estimatePostPrayerSlideMs(arabic, german, item.repeatCount),
      });
    } else {
      for (const page of paginate(arabic, ARABIC_PAGE_CHARS)) {
        slides.push({
          ...details, arabicText: page, translationDe: null, language: "ar",
          durationMs: estimatePostPrayerSlideMs(page, null, item.repeatCount),
        });
      }
      for (const page of paginate(german, GERMAN_PAGE_CHARS)) {
        slides.push({
          ...details, arabicText: null, translationDe: page, language: "de",
          durationMs: estimatePostPrayerSlideMs(null, page, 1),
        });
      }
    }
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
