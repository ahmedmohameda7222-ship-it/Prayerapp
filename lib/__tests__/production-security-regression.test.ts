import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("production security regression contracts", () => {
  it("pins Next.js to the patched 16.3.x security baseline", () => {
    const manifest = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const lock = JSON.parse(read("package-lock.json")) as {
      packages?: Record<string, { version?: string }>;
    };

    expect(manifest.dependencies?.next).toBe("16.3.3");
    expect(manifest.devDependencies?.["eslint-config-next"]).toBe("16.3.3");
    expect(lock.packages?.["node_modules/next"]?.version).toBe("16.3.3");
    expect(lock.packages?.["node_modules/eslint-config-next"]?.version).toBe("16.3.3");
  });

  it("requires one shared trusted Web Push endpoint policy at registration and delivery", () => {
    const subscriptionRoute = read("app/api/push/subscriptions/route.ts");
    const testRoute = read("app/api/push/test/route.ts");
    const delivery = read("lib/push/web-push.ts");

    for (const source of [subscriptionRoute, testRoute, delivery]) {
      expect(source).toContain("isTrustedWebPushEndpoint");
    }
    expect(subscriptionRoute).toContain('@/lib/security/web-push-endpoint');
    expect(testRoute).toContain('@/lib/security/web-push-endpoint');
    expect(delivery).toContain('@/lib/security/web-push-endpoint');
  });
});
