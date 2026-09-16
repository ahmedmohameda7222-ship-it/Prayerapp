import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("Masjid Display Admin settings", () => {
  it("edits only prayer-in-progress durations and the canonical Azkar playlist", () => {
    const page = source("app/admin/masjid-display/page.tsx");
    const actions = source("app/admin/masjid-display/actions.ts");

    expect(page).toContain("fajrPrayerDurationMinutes");
    expect(page).toContain("azkarPlaylistIds");
    expect(page).toContain("getAzkarItems(true)");
    expect(page).not.toMatch(/Iqama|iqama|calculation|Jumuah|jumuah/);

    expect(actions).toContain("getAzkarItems(true)");
    expect(actions).toContain("duration < 2 || duration > 120");
    expect(actions).toContain("Unknown Azkar playlist ID");
    expect(actions).toContain('from("masjid_display_settings")');
  });
});