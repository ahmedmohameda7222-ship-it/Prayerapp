import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("Adhan dependency boundary", () => {
  it("allows exactly one production import", () => {
    const matches = ["app", "components", "lib"]
      .flatMap(sourceFiles)
      .filter((path) => /\.(ts|tsx)$/.test(path))
      .filter((path) => /from ["']adhan["']/.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path).replaceAll("\\", "/"));

    expect(matches).toEqual(["lib/prayer-engine/calculate.ts"]);
  });
});
