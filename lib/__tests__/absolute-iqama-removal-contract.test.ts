import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["app", "components", "lib"];
const prayerNames = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const legacySnake = prayerNames.map((name) => `${name}_${"iqama"}`);
const legacyCamel = prayerNames.map((name) => `${name}${"Iqama"}`);

function activeFiles(root: string): string[] {
  const absolute = path.join(process.cwd(), root);
  return readdirSync(absolute).flatMap((name) => {
    const file = path.join(absolute, name);
    const relative = path.relative(process.cwd(), file);
    if (statSync(file).isDirectory()) return activeFiles(relative);
    if (/\.(?:test|spec)\.[tj]sx?$/u.test(name)) return [];
    return /\.[tj]sx?$/u.test(name) ? [relative] : [];
  });
}

describe("absolute daily Iqama storage removal", () => {
  it("has no active root-app reads or writes of the five legacy absolute fields", () => {
    const offenders: string[] = [];
    for (const file of roots.flatMap(activeFiles)) {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      for (const token of [...legacySnake, ...legacyCamel]) {
        const exact = new RegExp(`\\b${token}\\b`, "u");
        if (exact.test(text)) offenders.push(`${file}: ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("drops only the five legacy absolute Iqama columns and preserves Maghrib Program metadata", () => {
    const migration = readFileSync(path.join(process.cwd(), "supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql"), "utf8");
    for (const column of legacySnake) expect(migration).toContain(`drop column if exists ${column}`);
    expect(migration).not.toContain("drop column if exists maghrib_combined_isha_time");
  });

  it("documents the destructive target-environment deployment gate", () => {
    const checklist = readFileSync(path.join(process.cwd(), "docs/masjid-display/iqama-cutover-checklist.md"), "utf8");
    expect(checklist).toContain("all five delay columns are non-null");
    expect(checklist).toContain("BLOCKED");
    expect(checklist).toContain("supabase db reset");
    expect(checklist).toContain("Do not apply the destructive migration to the target environment");
  });
});