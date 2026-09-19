import type { AzkarItem } from "@/lib/types";
import type { DisplayAzkarDto } from "./feed-contract";

export function selectDisplayAzkar(all: AzkarItem[], playlistIds: string[]): DisplayAzkarDto[] {
  const selected = new Set(playlistIds);
  const emitted = new Set<string>();
  const result: DisplayAzkarDto[] = [];

  for (const item of all) {
    if (!item.isPublished || !selected.has(item.id) || emitted.has(item.id)) continue;
    emitted.add(item.id);
    result.push({
      id: item.id,
      category: item.category,
      arabicText: item.arabicText,
      translationDe: item.translationDe,
      source: item.source,
      repeatCount: item.repeatCount,
      sortOrder: item.sortOrder,
    });
  }

  return result;
}
