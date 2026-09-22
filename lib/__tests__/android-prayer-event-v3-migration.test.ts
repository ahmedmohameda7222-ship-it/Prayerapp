import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Android prayer event v3 database rollout", () => {
  it("adds an additive migration that permits both legacy p2 and current p3 receipt IDs", () => {
    const migrations = readdirSync("supabase/migrations").sort();
    const rollout = migrations.find((name) => name.includes("prayer_event_v3"));
    expect(rollout).toBeTruthy();
    if (!rollout) return;

    const sql = readFileSync(`supabase/migrations/${rollout}`, "utf8").toLowerCase();
    expect(sql).toContain("native_prayer_delivery_receipts");
    expect(sql).toMatch(/p\[23\]|p2.*p3|p3.*p2/u);
    expect(sql).toContain("drop constraint");
    expect(sql).toContain("add constraint");
  });
});
