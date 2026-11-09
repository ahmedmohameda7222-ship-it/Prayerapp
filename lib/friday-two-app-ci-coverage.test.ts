import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Friday producer/TV integration CI trigger", () => {
  it("runs full two-app verification for Friday Admin changes in both push and PR events", () => {
    const workflow = readFileSync(
      join(process.cwd(), ".github/workflows/masjid-display-verify.yml"),
      "utf8",
    );
    expect(workflow.split('"app/admin/jumuah/**"')).toHaveLength(3);
    expect(workflow.split('"lib/friday.ts"')).toHaveLength(3);
    expect(workflow.split('"lib/admin-jumuah-validation.ts"')).toHaveLength(3);
  });
});
