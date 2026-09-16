import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const LEGACY_PATTERNS: Array<[string, RegExp]> = [
  ["fajrIqama", /\bfajrIqama\b/u],
  ["dhuhrIqama", /\bdhuhrIqama\b/u],
  ["asrIqama", /\basrIqama\b/u],
  ["maghribIqama", /\bmaghribIqama\b/u],
  ["ishaIqama", /\bishaIqama\b/u],
  ["fajr_iqama", /\bfajr_iqama\b/u],
  ["dhuhr_iqama", /\bdhuhr_iqama\b/u],
  ["asr_iqama", /\basr_iqama\b/u],
  ["maghrib_iqama", /\bmaghrib_iqama\b/u],
  ["isha_iqama", /\bisha_iqama\b/u],
  ["getIqama(", /\bgetIqama\s*\(/u],
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
      return LEGACY_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => `${file}: ${label}`);
    });
    expect(offenders).toEqual([]);
  });

  it("preserves the Maghrib Program combined Isha field while removing its absolute Maghrib Iqama input", () => {
    const types = readFileSync(join(ROOT, "lib/types.ts"), "utf8");
    expect(types).toContain("combinedIshaTime");
    expect(types).not.toContain("maghribIqamaTime");
  });
});
