import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { MasjidDisplayFeedV1 } from "./feed-contract";
import { finalizeFeed } from "./feed-etag";
import { validateMasjidDisplayFeed } from "./validate-feed";

const FIXTURE_PATH = "lib/masjid-display/__fixtures__/feed-v1.json";

function loadFixture(): MasjidDisplayFeedV1 {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as MasjidDisplayFeedV1;
}

describe("Masjid Display Feed v1 golden fixture", () => {
  it("is accepted by the producer runtime validator", () => {
    const fixture = loadFixture();
    expect(validateMasjidDisplayFeed(fixture).schemaVersion).toBe(1);
    expect(fixture.prayers.schedule).toHaveLength(37);
    expect(fixture.prayers.schedule[0].date).toBe("2026-09-14");
    expect(fixture.prayers.schedule.at(-1)?.date).toBe("2026-10-20");
  });

  it("pins the producer canonical snapshot revision", () => {
    const fixture = loadFixture();
    const { snapshotRevision, ...body } = fixture;
    expect(finalizeFeed(body).snapshotRevision).toBe(snapshotRevision);
  });

  it("contains the offline activation families required by the consumer contract", () => {
    const fixture = loadFixture();
    expect(fixture.prayers.additionalJumuah.length).toBeGreaterThan(0);
    expect(fixture.azkar.map((item) => item.category)).toEqual(expect.arrayContaining(["Morning", "Evening"]));
    expect(fixture.announcements.some((item) => item.isUrgent)).toBe(true);
    expect(fixture.announcements.some((item) => item.displayStyle === "special" && item.displayFrom)).toBe(true);
    expect(fixture.events).toHaveLength(2);
    expect(fixture.campaigns.some((item) => item.donationUrl)).toBe(true);
    expect(fixture.campaigns.some((item) => item.donationUrl === null)).toBe(true);
  });
});
