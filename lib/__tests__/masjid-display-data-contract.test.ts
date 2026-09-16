import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const types = () => readFileSync("lib/types.ts", "utf8");

describe("masjid display data contracts", () => {
  it("defines the approved display settings and test scenarios", () => {
    const source = types();
    for (const token of [
      "AnnouncementDisplayStyle",
      "MasjidDisplaySettings",
      "MasjidDisplayTestScenario",
      "prayer_approaching",
      "waiting_for_iqama",
      "friday_first_countdown",
      "friday_next_countdown",
      "special_display",
      "stale_prayer_data",
      "missing_settings",
      "long_bilingual",
    ]) expect(source).toContain(token);
  });

  it("extends existing content types instead of creating display-only duplicates", () => {
    const source = types();
    expect(source).toMatch(/interface Announcement[\s\S]*displayStyle/);
    expect(source).toMatch(/interface Announcement[\s\S]*displayFrom/);
    expect(source).toMatch(/interface DonationCampaign[\s\S]*donationUrl/);
    expect(source).toMatch(/interface MosqueSettings[\s\S]*publicAppUrl/);
  });

  it("provides typed singleton data modules", () => {
    const displaySettings = readFileSync("lib/data/masjid-display-settings.ts", "utf8");
    const testState = readFileSync("lib/data/masjid-display-test-state.ts", "utf8");
    expect(displaySettings).toContain("MasjidDisplaySettings");
    expect(displaySettings).toContain("masjid_display_settings");
    expect(testState).toContain("MasjidDisplayTestState");
    expect(testState).toContain("masjid_display_test_state");
    expect(testState).not.toContain("Record<string, unknown>");
  });
});
