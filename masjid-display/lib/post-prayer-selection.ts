import type { DisplayAzkarDto, DisplayPrayerName, MasjidDisplayFeedV1 } from "./feed-types";

export function appliesToCompletedPrayer(
  item: DisplayAzkarDto,
  prayer: DisplayPrayerName,
): boolean {
  if (item.id === "after-prayer-fajr-maghrib-tahlil") {
    return prayer === "fajr" || prayer === "maghrib";
  }
  if (item.id === "after-prayer-fajr-ilm-rizq-amal") {
    return prayer === "fajr";
  }
  return true;
}

export function selectedPostPrayerAzkar(
  feed: MasjidDisplayFeedV1,
  prayer: DisplayPrayerName,
): DisplayAzkarDto[] {
  const selected = new Set(feed.displaySettings.azkarPlaylistIds);
  return feed.azkar
    .filter((item) =>
      item.category === "After Prayer" &&
      selected.has(item.id) &&
      appliesToCompletedPrayer(item, prayer),
    )
    .sort((a,b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
