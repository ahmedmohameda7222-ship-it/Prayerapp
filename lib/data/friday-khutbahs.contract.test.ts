import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migrationPath = "supabase/migrations/20260826160500_friday_v2_khutbahs.sql";
const dataPath = "lib/data/friday-khutbahs.ts";

describe("Friday khutbah persistence contract", () => {
  it("creates one multilingual khutbah row per Friday date with the approved fields", () => {
    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    if (!existsSync(join(process.cwd(), migrationPath))) return;

    const migration = source(migrationPath);
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.friday_khutbahs");
    expect(migration).toContain("id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    expect(migration).toContain("date DATE UNIQUE NOT NULL");
    for (const locale of ["ar", "en", "de", "tr"]) {
      expect(migration).toContain(`title_${locale} TEXT`);
      expect(migration).toContain(`content_${locale} TEXT`);
    }
    expect(migration).toContain("published BOOLEAN NOT NULL DEFAULT false");
    expect(migration).toContain("created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    expect(migration).toContain("updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
  });

  it("enables RLS and grants public roles SELECT only for published rows", () => {
    expect(existsSync(join(process.cwd(), migrationPath))).toBe(true);
    if (!existsSync(join(process.cwd(), migrationPath))) return;

    const migration = source(migrationPath);
    expect(migration).toContain("ALTER TABLE public.friday_khutbahs ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain('CREATE POLICY "Public read published Friday khutbahs"');
    expect(migration).toContain("FOR SELECT");
    expect(migration).toContain("TO anon, authenticated");
    expect(migration).toContain("USING (published = true)");
    expect(migration).toContain("REVOKE ALL ON TABLE public.friday_khutbahs FROM anon, authenticated");
    expect(migration).toContain("GRANT SELECT ON TABLE public.friday_khutbahs TO anon, authenticated");
  });

  it("loads exact localized fields by date without translating or fabricating content", () => {
    expect(existsSync(join(process.cwd(), dataPath))).toBe(true);
    if (!existsSync(join(process.cwd(), dataPath))) return;

    const data = source(dataPath);
    expect(data).toContain('from("friday_khutbahs")');
    expect(data).toContain('.eq("date", date)');
    expect(data).toContain('.eq("published", true)');
    expect(data).toContain("titleAr:");
    expect(data).toContain("contentAr:");
    expect(data).toContain("titleEn:");
    expect(data).toContain("contentEn:");
    expect(data).toContain("titleDe:");
    expect(data).toContain("contentDe:");
    expect(data).toContain("titleTr:");
    expect(data).toContain("contentTr:");
    expect(data).not.toContain("getLocalizedField");
  });

  it("uses the public cache pattern without stale unpublished fallback and exposes immediate invalidation", () => {
    expect(existsSync(join(process.cwd(), dataPath))).toBe(true);
    if (!existsSync(join(process.cwd(), dataPath))) return;

    const data = source(dataPath);
    expect(data).toContain("getCached");
    expect(data).toContain("saveToPersistentCache");
    expect(data).toContain("loadFromPersistentCache");
    expect(data).not.toContain("loadFromPersistentCacheStale");
    expect(data).toContain("clearPersistentCachePrefix");
    expect(data).toContain("invalidateFridayKhutbahCaches");
    expect(data).toContain('invalidateCachePrefix("friday_khutbah_")');
  });
});
