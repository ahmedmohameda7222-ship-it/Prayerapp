export interface GermanFridayKhutbah {
  date: string;
  titleDe: string;
  contentDe: string;
}

/** Revalidate the narrow public payload at the isolated TV, not just on the root API. */
export function parseGermanKhutbah(payload: unknown, date: string): GermanFridayKhutbah | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const response = payload as Record<string, unknown>;
  if (response.date !== date || !response.khutbah ||
      typeof response.khutbah !== "object" || Array.isArray(response.khutbah)) return null;
  const row = response.khutbah as Record<string, unknown>;
  if (row.date !== date || typeof row.contentDe !== "string") return null;
  const contentDe = row.contentDe.trim();
  if (!contentDe || contentDe.length > 50_000) return null;
  const titleDe = typeof row.titleDe === "string" ? row.titleDe.trim() : "";
  if (titleDe.length > 300) return null;
  return { date, titleDe, contentDe };
}

/** Break on word boundaries, not letter counts or arbitrary CSS truncation. */
export function paginateGermanKhutbah(raw: string, maxChars = 780): string[] {
  const limit = Math.max(40, Math.floor(maxChars));
  const words = raw.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const pages: string[] = [];
  let current = "";
  for (const original of words) {
    let word = original;
    while (word.length > limit) {
      if (current) { pages.push(current); current = ""; }
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

export const FRIDAY_KHUTBAH_PAGE_MS = 25_000;
export function germanKhutbahPageIndex(nowMs: number, serviceStartMs: number, pageCount: number): number {
  if (pageCount <= 1) return 0;
  return Math.floor(Math.max(0, nowMs - serviceStartMs) / FRIDAY_KHUTBAH_PAGE_MS) % pageCount;
}
