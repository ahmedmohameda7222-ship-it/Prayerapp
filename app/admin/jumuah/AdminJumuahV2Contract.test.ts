import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Friday Admin V2 contract", () => {
  it("sources selectable dates from authoritative Friday prayer rows", () => {
    const page = source("app/admin/jumuah/page.tsx");

    expect(page).toContain('import { getPrayerTimes } from "@/lib/data/prayer-times"');
    expect(page).toContain("getPrayerTimes(true");
    expect(page).toContain("isFridayIso");
    expect(page).toContain("selectedFriday");
    expect(page).toContain("<select");
    expect(page).not.toContain('type: "date"');
  });

  it("renders a locked Primary from the selected prayer row Dhuhr", () => {
    const page = source("app/admin/jumuah/page.tsx");

    expect(page).toContain("selectedPrayer.dhuhr");
    expect(page).toContain('data-testid="admin-primary-jumuah"');
    expect(page).toContain('data-locked="true"');
  });

  it("offers exactly one editable time for an additional Jumuah", () => {
    const page = source("app/admin/jumuah/page.tsx");

    expect(page).toContain('key: "prayerTime"');
    expect(page).not.toContain("khutbahTime");
  });

  it("passes Primary authority to the additional-service table for legacy warnings", () => {
    const page = source("app/admin/jumuah/page.tsx");
    const table = source("components/admin/JumuahTable.tsx");

    expect(page).toContain("primaryTime={selectedPrayer.dhuhr}");
    expect(table).toContain("primaryTime: string");
    expect(table).toContain("legacyInvalid");
    expect(table).toContain('data-legacy-invalid="true"');
    expect(table).toContain("onCorrectLegacy");
    expect(table).not.toContain("item.khutbahTime");
  });
});
