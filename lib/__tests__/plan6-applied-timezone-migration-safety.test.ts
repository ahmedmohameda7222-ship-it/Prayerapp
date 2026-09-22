import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 6 applied-timezone migration safety", () => {
  it("refuses to guess the applied timezone when legacy settings have a pending calculation revision", () => {
    const migrationName = readdirSync("supabase/migrations")
      .sort()
      .find((name) => name.includes("applied_timezone"));
    expect(migrationName).toBeTruthy();
    if (!migrationName) return;

    const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8").toLowerCase();
    const backfill = sql.indexOf("set applied_timezone = p.timezone");

    expect(backfill).toBeGreaterThan(-1);
    expect(sql).toContain("calculation_revision <> applied_calculation_revision");
    expect(sql).toContain("cannot infer applied timezone");
    expect(sql.indexOf("cannot infer applied timezone")).toBeLessThan(backfill);
  });
});
