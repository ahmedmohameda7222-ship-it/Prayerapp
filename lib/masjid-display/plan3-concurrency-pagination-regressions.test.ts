import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Plan 3 concurrent snapshot regression", () => {
  it("derives generatedAt only from timestamps captured by the source reads", () => {
    const generatedAt = read("lib/data/masjid-display-generated-at.ts");
    const buildFeed = read("lib/masjid-display/build-feed.ts");

    expect(generatedAt).not.toContain("createServerClient");
    expect(generatedAt).not.toContain("loadSourceTimestamps");
    expect(generatedAt).toContain("sourceTimestamps");
    expect(buildFeed).toContain("sourceTimestamps:");
    expect(buildFeed).not.toContain("prayerIds: representedPrayers.map");
    expect(buildFeed).not.toContain("eventIds: projectedEvents.map");
  });

  it("captures source updated_at together with every feed-only dynamic row", () => {
    for (const path of [
      "lib/data/jumuah.ts",
      "lib/data/announcements.ts",
      "lib/data/events.ts",
      "lib/data/donations.ts",
    ]) {
      const source = read(path);
      expect(source).toContain("updated_at");
      expect(source).toContain("sourceUpdatedAt");
    }
  });

  it("captures singleton source timestamps in the same reads used by the feed", () => {
    const prayerSettings = read("lib/data/prayer-settings.ts");
    const mosqueSettings = read("lib/data/mosque-settings.ts");
    const displaySettings = read("lib/data/masjid-display-settings.ts");

    expect(prayerSettings).toContain("getPrayerSettingsForDisplay");
    expect(prayerSettings).toContain("sourceUpdatedAt");
    expect(mosqueSettings).toContain("getMosqueSettingsForDisplay");
    expect(mosqueSettings).toContain("sourceUpdatedAt");
    expect(displaySettings).toContain("getMasjidDisplaySettingsForDisplay");
    expect(displaySettings).toContain("sourceUpdatedAt");
  });
});

describe("Plan 3 bounded-query pagination regression", () => {
  it("paginates every bounded display-window reader instead of trusting max_rows", () => {
    for (const path of [
      "lib/data/jumuah.ts",
      "lib/data/announcements.ts",
      "lib/data/events.ts",
      "lib/data/donations.ts",
    ]) {
      const source = read(path);
      expect(source).toContain("DISPLAY_FEED_PAGE_SIZE");
      expect(source).toContain(".range(");
      expect(source).toContain("rows.length < DISPLAY_FEED_PAGE_SIZE");
    }
  });
});
