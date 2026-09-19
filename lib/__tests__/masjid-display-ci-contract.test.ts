import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = ".github/workflows/ci.yml";
const verifierPath = "scripts/verify-masjid-display-contract.mjs";

describe("root CI Masjid Display release contract", () => {
  it("contains the cross-project verifier entry point", () => {
    expect(existsSync(verifierPath)).toBe(true);
  });

  it("preserves the embedded root security SQL line structure", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("end if;\n            if not has_table_privilege('authenticated', 'public.user_prayer_reminders'");
    expect(workflow).toContain("if not has_function_privilege(\n              'service_role'");
    expect(workflow).toContain(
      "raise exception 'synthetic admin audit row was not preserved';\\n" +
        "            end if;\\n          end\\n          " +
        "$" +
        "$;\\n          rollback;",
    );
    expect(workflow).not.toContain("\\n          " + "$" + ";\\n");
    expect(workflow).toContain(") values (\n            'legacy-test@local.invalid'");
  });

  it("enforces root, TV, and cross-project verification without replacing existing root gates", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npx tsc --noEmit");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("supabase db reset --local --no-seed");

    expect(workflow).toContain("node scripts/verify-masjid-display-contract.mjs");
    expect(workflow).toContain("working-directory: masjid-display");
    expect(workflow).toContain("npm run typecheck");
  });
});
