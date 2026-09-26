import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 6 dynamic-content budget timezone authority", () => {
  it("derives the capacity window from the applied prayer timezone", () => {
    const migrations = readdirSync("supabase/migrations").sort();
    const appliedTimezoneIndex = migrations.findIndex((name) => name.includes("applied_timezone"));
    expect(appliedTimezoneIndex).toBeGreaterThan(-1);

    const budgetDefinitions = migrations
      .map((name, index) => ({
        name,
        index,
        sql: readFileSync(`supabase/migrations/${name}`, "utf8").toLowerCase(),
      }))
      .filter(({ sql }) =>
        sql.includes("create or replace function public.assert_masjid_display_dynamic_content_budget()"),
      );

    expect(budgetDefinitions.length).toBeGreaterThan(0);
    const latest = budgetDefinitions.at(-1);
    expect(latest).toBeTruthy();
    if (!latest) return;

    expect(latest.index).toBeGreaterThan(appliedTimezoneIndex);

    const start = latest.sql.indexOf(
      "create or replace function public.assert_masjid_display_dynamic_content_budget()",
    );
    const end = latest.sql.indexOf(
      "revoke all on function public.assert_masjid_display_dynamic_content_budget()",
      start,
    );
    const fn = latest.sql.slice(start, end);

    expect(fn).toContain("applied_timezone");
    expect(fn).toContain("from public.prayer_settings");
    expect(fn).toMatch(/where\s+(?:p\.)?id\s*=\s*\'1\'/);
    expect(fn).toContain("at time zone v_time_zone");
    expect(fn).not.toContain("at time zone 'europe/berlin'");
  });
});
