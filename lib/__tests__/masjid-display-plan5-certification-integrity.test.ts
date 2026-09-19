import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plan 5 certification integrity", () => {
  it("requires the migration dry run to reject deleted or changed certified prayer rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("representative prayer row changed or missing");
    expect(source).toMatch(/create temporary table plan5_before_prayer as[\s\S]+select[\s\S]+id,[\s\S]+date,/);
    expect(source).toMatch(
      /from plan5_before_prayer b[\s\S]+where not exists \([\s\S]+select 1[\s\S]+from public\.prayer_times p[\s\S]+p\.id = b\.id/,
    );
  });

  it("requires the migration dry run to reject deleted or changed certified Jumuah rows", () => {
    const source = readFileSync("scripts/verify-masjid-display-migration.sh", "utf8");

    expect(source).toContain("Jumuah row count changed");
    expect(source).toMatch(
      /from plan5_before_jumuah b[\s\S]+where not exists \([\s\S]+select 1[\s\S]+from public\.jumuah_times j/,
    );
  });
});
