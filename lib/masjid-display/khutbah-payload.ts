export interface PublicGermanKhutbah {
  date: string;
  titleDe: string;
  contentDe: string;
}

/** Public TV can see published German copy only; no other locale or Admin fields. */
export function publishedGermanKhutbah(row: unknown, date: string): PublicGermanKhutbah | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const record = row as Record<string, unknown>;
  if (record.published !== true || record.date !== date ||
      typeof record.content_de !== "string") return null;
  const contentDe = record.content_de.trim();
  if (!contentDe || contentDe.length > 50_000) return null;
  const titleDe = typeof record.title_de === "string" ? record.title_de.trim() : "";
  if (titleDe.length > 300) return null;
  return { date, titleDe, contentDe };
}
