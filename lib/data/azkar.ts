import type { AzkarCategory, AzkarItem } from "@/lib/types";
import { hardcodedAzkarCategories, hardcodedAzkarItems } from "./hardcoded-azkar";

const categoryOrder = new Map<AzkarCategory, number>(
  hardcodedAzkarCategories.map((category, index) => [category, index])
);

// This is the real repository source revision for the current canonical hardcoded
// Azkar pack. Existing items inherit this timestamp. When a represented field of
// an individual item changes later, add that item's id to the override map with
// the source edit's explicit revision timestamp. Do not bump the baseline for an
// unrelated item: generatedAt must remain stable for selected items whose source
// did not change.
const HARDCODED_AZKAR_BASE_SOURCE_REVISION = "2026-08-22T21:46:19.000Z";

const hardcodedAzkarSourceRevisionOverrides: Readonly<Record<string, string>> = Object.freeze({});

export function getAzkarSourceRevisionTimestamps(ids: string[]): string[] {
  const knownIds = new Set<string>(hardcodedAzkarItems.map((item) => item.id));
  const representedIds = [...new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))];

  return representedIds
    .filter((id) => knownIds.has(id))
    .map((id) => hardcodedAzkarSourceRevisionOverrides[id] ?? HARDCODED_AZKAR_BASE_SOURCE_REVISION);
}

export async function getAzkarCategories(): Promise<AzkarCategory[]> {
  return [...hardcodedAzkarCategories];
}

export async function getAzkarItems(includeUnpublished = false): Promise<AzkarItem[]> {
  return hardcodedAzkarItems
    .filter((item) => includeUnpublished || item.isPublished)
    .map((item) => ({ ...item }))
    .sort((a, b) => {
      const categoryDifference =
        (categoryOrder.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(b.category) ?? Number.MAX_SAFE_INTEGER);
      return categoryDifference || a.sortOrder - b.sortOrder;
    });
}
