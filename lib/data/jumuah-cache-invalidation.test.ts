import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

describe("Jumuah public cache invalidation", () => {
  it("uses one shared invalidator for data-layer and admin mutations consumed by the display feed", () => {
    const data = source("lib/data/jumuah.ts");
    const actions = source("app/admin/jumuah/actions.ts");

    expect(data).toContain("export function invalidateJumuahPublicCache()");
    expect(data).toContain('invalidateCachePrefix("jumuah_times")');
    expect(data).toContain('clearPersistentCachePrefix("jumuah_times")');
    expect((data.match(/invalidateJumuahPublicCache\(\);/g) || []).length).toBeGreaterThanOrEqual(3);

    expect(actions).toContain('import { invalidateJumuahPublicCache } from "@/lib/data/jumuah";');
    expect((actions.match(/invalidateJumuahPublicCache\(\);/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});
