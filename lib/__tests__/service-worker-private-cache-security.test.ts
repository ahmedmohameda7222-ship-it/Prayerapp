import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

describe("service worker private-data cache contract", () => {
  it("never retains account responses and actively evicts legacy private page entries", () => {
    expect(source).toContain('url.pathname.startsWith("/account")');

    expect(source).toContain('response.headers.get("cache-control")');
    expect(source).toMatch(/cache-control[\s\S]*no-store/i);
    expect(source).toMatch(/cache-control[\s\S]*private/i);

    expect(source).toContain("purgePrivatePageEntries");
    expect(source).toMatch(/purgePrivatePageEntries\(PAGE_CACHE\)/);
    expect(source).toMatch(/purgePrivatePageEntries[\s\S]*\/account/);
  });
});
