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

describe("Plan 6 deferred absolute-Iqama storage cutover", () => {
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

  it("keeps the historical migration version non-destructive during Plan 6", () => {
    const migration = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql"),
      "utf8",
    ).toLowerCase();

    for (const column of legacySnake) {
      expect(migration).toContain(column);
      expect(migration).not.toContain(`drop column if exists ${column}`);
    }
    expect(migration).toContain("plan 6");
    expect(migration).toContain("not runtime iqama authority");
  });

  it("normalizes previously destructive environments without restoring runtime authority", () => {
    const migration = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260924070000_plan6_premerge_runtime_bootstrap.sql"),
      "utf8",
    ).toLowerCase();

    for (const column of legacySnake) {
      expect(migration).toContain(`add column if not exists ${column} text`);
    }
    expect(migration).not.toContain("drop column");
    expect(migration).toContain("calculation_revision=1 / applied_calculation_revision=0");
    expect(migration).toContain("20, 15, 15, 5, 10");
  });

  it("documents that destructive production removal is deferred to a later approved plan", () => {
    const checklist = readFileSync(
      path.join(process.cwd(), "docs/masjid-display/iqama-cutover-checklist.md"),
      "utf8",
    );
    expect(checklist).toContain("Plan 7");
    expect(checklist).toContain("DEFERRED");
    expect(checklist).toContain("must remain physically present");
    expect(checklist).toContain("not runtime authority");
  });
});
