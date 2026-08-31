import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflowDir = join(root, ".github/workflows");
const workflowNames = readdirSync(workflowDir).filter((name) => /\.ya?ml$/u.test(name));
const workflows = workflowNames.map((name) => ({
  name,
  source: readFileSync(join(workflowDir, name), "utf8"),
}));
const read = (path: string) => readFileSync(join(root, path), "utf8");

const actionRefPattern = /^\s*-?\s*uses:\s*([^\s@]+)@([^\s#]+)(?:\s+#.*)?$/u;
const fullShaPattern = /^[0-9a-f]{40}$/u;

function extractRunScripts(source: string) {
  const lines = source.split("\n");
  const scripts: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)run:\s*\|\s*$/u);
    if (!match) continue;

    const runIndent = match[1].length;
    const scriptLines: string[] = [];

    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() === "") {
        scriptLines.push(line);
        continue;
      }

      const lineIndent = line.match(/^\s*/u)?.[0].length ?? 0;
      if (lineIndent <= runIndent) {
        index -= 1;
        break;
      }

      scriptLines.push(line);
    }

    scripts.push(scriptLines.join("\n"));
  }

  return scripts;
}

describe("CI supply-chain security contract", () => {
  it("pins every external GitHub Action to an immutable full commit SHA", () => {
    for (const { name, source } of workflows) {
      for (const line of source.split("\n")) {
        const match = line.match(actionRefPattern);
        if (!match || match[1].startsWith("./")) continue;
        expect(match[2], `${name}: ${line.trim()}`).toMatch(fullShaPattern);
      }
    }
  });

  it("uses fixed tool versions and does not persist checkout credentials", () => {
    const combined = workflows.map(({ source }) => source).join("\n");
    expect(combined).not.toMatch(/version:\s*latest\b/u);
    expect(combined).toContain("version: 2.116.0");

    const checkoutUses = combined.match(/uses:\s*actions\/checkout@/gu) || [];
    const nonPersistingCheckouts = combined.match(/persist-credentials:\s*false/gu) || [];
    expect(checkoutUses.length).toBeGreaterThan(0);
    expect(nonPersistingCheckouts).toHaveLength(checkoutUses.length);
  });

  it("keeps ordinary CI on explicit read-only repository permissions", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toMatch(/(?:^|\n)permissions:\s*\n\s+contents:\s*read(?:\n|$)/u);
    expect(ci).not.toMatch(/(?:^|\n)\s+(?:actions|checks|contents|deployments|discussions|id-token|issues|packages|pages|pull-requests|repository-projects|security-events|statuses):\s*write\b/u);
  });

  it("audits production dependencies after the clean install", () => {
    const ci = read(".github/workflows/ci.yml");
    const install = ci.indexOf("- run: npm ci");
    const audit = ci.indexOf("- run: npm audit --omit=dev");
    expect(install).toBeGreaterThanOrEqual(0);
    expect(audit).toBeGreaterThan(install);
  });

  it("never interpolates workflow-dispatch inputs into shell source", () => {
    for (const { name, source } of workflows) {
      for (const script of extractRunScripts(source)) {
        expect(script, name).not.toMatch(/\$\{\{\s*inputs\./u);
      }
    }
  });

  it("does not expose Android production signing secrets at job scope", () => {
    const release = read(".github/workflows/android-production-release.yml");
    expect(release).not.toMatch(/^ {6}ANDROID_(?:KEYSTORE|KEY)_/mu);
  });

  it("pins the Gradle 9.3.1 distribution checksum", () => {
    const wrapper = read("android-twa/gradle/wrapper/gradle-wrapper.properties");
    expect(wrapper).toContain("distributionUrl=https\\://services.gradle.org/distributions/gradle-9.3.1-bin.zip");
    expect(wrapper).toContain("distributionSha256Sum=b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06");
  });
});
