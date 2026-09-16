import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const LEGACY = [
  "fajrIqama",
  "dhuhrIqama",
  "asrIqama",
  "maghribIqama",
  "ishaIqama",
  "fajr_iqama",
  "dhuhr_iqama",
  "asr_iqama",
  "maghrib_iqama",
  "isha_iqama",
  "getIqama(",
];
const IGNORE_PREFIXES = [
  ".git/",
  ".next/",
  "node_modules/",
  "docs/",
  "supabase/migrations/",
  "lib/__tests__/masjid-display-iqama-cutover.test.ts",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replaceAll("\\", "/");
    if (IGNORE_PREFIXES.some((prefix) => rel === prefix.slice(0, -1) || rel.startsWith(prefix))) return [];
    const stat = statSync(full);
    if (stat.isDirectory()) return sourceFiles(full);
    if (!/\.(?:ts|tsx|js|jsx|sql)$/.test(name)) return [];
    return [rel];
  });
}

describe("Masjid Display Plan 2 Iqama cutover", () => {
  it("has no active root Prayerapp consumer of legacy absolute Iqama fields or getIqama", () => {
    const offenders = sourceFiles(ROOT).flatMap((file) => {
      const text = readFileSync(join(ROOT, file), "utf8");
      return LEGACY.filter((needle) => text.includes(needle)).map((needle) => `${file}: ${needle}`);
    });
    expect(offenders).toEqual([]);
  });

  it("preserves the Maghrib Program combined Isha field while removing its absolute Maghrib Iqama input", () => {
    const types = readFileSync(join(ROOT, "lib/types.ts"), "utf8");
    expect(types).toContain("combinedIshaTime");
    expect(types).not.toContain("maghribIqamaTime");
  });
});
