import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("Masjid Display Test Control Admin", () => {
  it("is a remote control for all synthetic scenarios, not an embedded preview", () => {
    const page = source("app/admin/masjid-display-test/page.tsx");
    expect(page).toContain("MASJID_DISPLAY_TEST_SCENARIOS");
    expect(page).toContain("startTestScenario");
    expect(page).toContain("extendTestScenario");
    expect(page).toContain("stopTestScenario");
    expect(page).not.toMatch(/<iframe|buildMasjidDisplayFeed|getPrayerSettings/);
  });

  it("uses exactly 15 minutes for start and extension and writes only test state", () => {
    const actions = source("app/admin/masjid-display-test/actions.ts");
    expect(actions).toContain("15 * 60 * 1000");
    expect(actions).toContain('from("masjid_display_test_state")');
    expect(actions).toContain("buildTestFixture");
    expect(actions).toContain("publicAppUrl");
    expect(actions).not.toMatch(/from\(["'](?:prayer_times|announcements|events|donation_campaigns)["']\)/);
  });
});