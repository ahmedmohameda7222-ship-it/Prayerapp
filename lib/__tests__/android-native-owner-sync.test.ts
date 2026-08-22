import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Android native owner synchronization", () => {
  it("does not configure a fresh native install before successful account enrollment establishes ownership", () => {
    const provider = readFileSync(join(process.cwd(), "components/providers/NativeAndroidProvider.tsx"), "utf8");
    expect(provider).toContain("const configuredOwnerId = localStorage.getItem(NATIVE_ACCOUNT_OWNER_KEY)");
    expect(provider).toContain("configuredOwnerId !== session.user.id");
  });
});
