import fixture from "./__fixtures__/feed-v1.json";
import { describe, expect, it } from "vitest";
import { validateFeedV1 } from "./validate-feed";

function cloneFixture() {
  return structuredClone(fixture);
}

describe("Feed v1 consumer validation", () => {
  it("accepts the producer golden fixture", () => {
    expect(validateFeedV1(fixture).schemaVersion).toBe(1);
  });

  it("rejects an unsupported schema", () => {
    expect(() => validateFeedV1({ ...fixture, schemaVersion: 2 })).toThrow(/schema/i);
  });

  it("rejects duplicate prayer dates", () => {
    const bad = cloneFixture();
    bad.prayers.schedule.push(structuredClone(bad.prayers.schedule[0]));
    expect(() => validateFeedV1(bad)).toThrow(/date/i);
  });

  it("rejects malformed HH:MM prayer values", () => {
    const bad = cloneFixture();
    bad.prayers.schedule[0].fajr = "25:61";
    expect(() => validateFeedV1(bad)).toThrow(/fajr|time/i);
  });

  it("rejects missing or negative iqama delays", () => {
    const missing = cloneFixture() as unknown as { prayers: { iqamaDelays: Record<string, unknown> } };
    delete missing.prayers.iqamaDelays.fajr;
    expect(() => validateFeedV1(missing)).toThrow(/delay|fajr/i);

    const negative = cloneFixture();
    negative.prayers.iqamaDelays.fajr = -1;
    expect(() => validateFeedV1(negative)).toThrow(/delay|fajr/i);
  });

  it("rejects prayer durations outside 2 through 120 minutes", () => {
    const bad = cloneFixture();
    bad.displaySettings.prayerDurations.isha = 121;
    expect(() => validateFeedV1(bad)).toThrow(/duration|isha/i);
  });

  it("rejects invalid URLs", () => {
    const bad = cloneFixture();
    bad.mosque.publicAppUrl = "javascript:alert(1)";
    expect(() => validateFeedV1(bad)).toThrow(/url/i);
  });

  it("rejects incomplete Arabic/German dynamic content", () => {
    const bad = cloneFixture();
    bad.announcements[0].messageDe = "";
    expect(() => validateFeedV1(bad)).toThrow(/messageDe|German|announcement/i);
  });
});
