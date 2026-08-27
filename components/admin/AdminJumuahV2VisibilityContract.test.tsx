import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Admin Jumuah V2 visibility contract", () => {
  it("hides the Primary summary card while preserving Dhuhr authority", () => {
    const page = source("app/admin/jumuah/page.tsx");
    const actions = source("app/admin/jumuah/actions.ts");

    expect(page).not.toContain('data-testid="admin-primary-jumuah"');
    expect(page).toContain("selectedPrayer.dhuhr");
    expect(page).toContain("primaryTime={selectedPrayer.dhuhr}");
    expect(actions).toContain('client.from("prayer_times").select("date,dhuhr")');
    expect(actions).toContain("validateAdditionalJumuah({");
    expect(actions).toContain("dhuhr: String(primary.dhuhr)");
  });
});
