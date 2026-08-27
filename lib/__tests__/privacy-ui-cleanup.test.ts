import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("privacy page cleanup", () => {
  it("does not render the legal review notice or legal notice link", () => {
    const source = readFileSync("app/privacy/page.tsx", "utf8");

    expect(source).not.toContain('t("legal.reviewRequired")');
    expect(source).not.toContain('href="/imprint"');
    expect(source).not.toContain('from "next/link"');
  });
});
