import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Web Push delivery resource bounds", () => {
  it("does not fan every stored subscription out concurrently", () => {
    const source = read("lib/push/web-push.ts");

    expect(source).toContain("PUSH_DELIVERY_CONCURRENCY");
    expect(source).toMatch(/for\s*\(let\s+offset\s*=\s*0;/u);
    expect(source).toContain("targets.slice(offset, offset + PUSH_DELIVERY_CONCURRENCY)");
    expect(source).toMatch(/Promise\.all\(\s*batch\.map/u);
    expect(source).not.toMatch(/Promise\.all\(\s*targets\.map/u);
  });
});
