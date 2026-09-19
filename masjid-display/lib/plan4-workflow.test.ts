import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function workflow() {
  return readFileSync(
    path.resolve(process.cwd(), "../.github/workflows/masjid-display-verify.yml"),
    "utf8",
  );
}

describe("Plan 4 verification workflow", () => {
  it("runs for pull requests and pushes to main as a durable TV gate", () => {
    const source = workflow();

    expect(source).toContain("pull_request:");
    expect(source).toMatch(/push:\s*\n\s*branches:\s*\n(?:\s*- .+\n)*\s*- main\b/);
  });

  it("re-runs when root Feed/Test Control integration authorities change", () => {
    const source = workflow();

    for (const requiredPath of [
      '"masjid-display/**"',
      '"app/api/public/masjid-display/**"',
      '"app/api/public/masjid-display-test-control/**"',
      '"app/admin/masjid-display-test/**"',
      '"lib/masjid-display/**"',
      '"lib/data/**"',
      '"lib/supabase/**"',
      '"supabase/migrations/**"',
      '"package.json"',
      '"package-lock.json"',
    ]) {
      expect(source).toContain(requiredPath);
    }
  });
});
