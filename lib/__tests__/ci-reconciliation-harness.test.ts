import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CI historical reconciliation harness", () => {
  it("restores the historical p2 receipt constraint before replaying reconciliation", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    const start = workflow.indexOf("- name: Verify reconciliation idempotence and data preservation");
    const end = workflow.indexOf("- name: Verify reconciliation rejects incompatible partial schemas");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = workflow.slice(start, end);
    expect(block).toContain("check (event_id ~ '^p2:[0-9a-f]{64}$');");
    expect(block).toContain("insert into auth.users");
    expect(block).toContain("insert into public.native_prayer_installations");
    expect(block.match(/20260902211847_prelaunch_schema_reconciliation\.sql/g)?.length).toBe(2);
    expect(block).toContain("rollback;");
  });
  it("restores the final migration head after historical Masjid Display migration certification", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    const start = workflow.indexOf("- name: Certify Masjid Display legacy-Iqama migration safety");
    const end = workflow.indexOf("- name: Verify reconciliation idempotence and data preservation");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const bridge = workflow.slice(start, end);
    expect(bridge).toContain("supabase db reset --local --no-seed");
  });

});
