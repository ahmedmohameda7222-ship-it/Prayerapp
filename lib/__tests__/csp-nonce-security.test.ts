import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");

describe("nonce-based Content Security Policy", () => {
  it("removes inline script execution and issues a per-request nonce through Next proxy", () => {
    const config = source("next.config.ts");
    const proxy = source("proxy.ts");

    expect(config).not.toMatch(/script-src[^\n;]*'unsafe-inline'/u);
    expect(proxy).toContain("crypto.randomUUID()");
    expect(proxy).toContain("x-nonce");
    expect(proxy).toContain("'strict-dynamic'");
    expect(proxy).toContain("script-src-attr 'none'");
    expect(proxy).toMatch(/script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/u);
    expect(proxy).toMatch(/style-src 'self' 'nonce-\$\{nonce\}'/u);
    expect(proxy).toContain("style-src-attr 'unsafe-inline'");
    expect(proxy).not.toMatch(/script-src[^\n;]*'unsafe-inline'/u);
  });
});
