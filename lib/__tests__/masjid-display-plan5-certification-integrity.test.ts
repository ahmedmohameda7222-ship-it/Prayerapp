import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 5 certification integrity", () => {
  it("requires the migration dry run to reject deleted or changed certified Jumuah rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("Jumuah row count changed");
    expect(source).toMatch(
      /from plan5_before_jumuah b\s+where not exists \(\s+select 1\s+from public\.jumuah_times j/s,
    );
  });
});
