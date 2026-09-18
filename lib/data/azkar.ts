import type { AzkarCategory, AzkarItem } from "@/lib/types";
import { hardcodedAzkarCategories, hardcodedAzkarItems } from "./hardcoded-azkar";

const categoryOrder = new Map<AzkarCategory, number>(
  hardcodedAzkarCategories.map((category, index) => [category, index])
);

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
