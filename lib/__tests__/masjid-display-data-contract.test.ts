import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const types = () => readFileSync("lib/types.ts", "utf8");

describe("masjid display data contracts", () => {
  it("retains only production display settings and content types", () => {
    const source = types();
    expect(source).toContain("AnnouncementDisplayStyle");
    expect(source).toContain("MasjidDisplaySettings");
    expect(source).not.toContain("MasjidDisplayTestScenario");
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
    expect(displaySettings).toContain("MasjidDisplaySettings");
    expect(displaySettings).toContain("masjid_display_settings");
  });
});
