import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import tr from "../../messages/tr.json";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("public launch technical contract", () => {
  it("provides localized privacy and imprint shells without claiming legal approval", () => {
    expect(existsSync(path.join(process.cwd(), "app/privacy/page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "app/imprint/page.tsx"))).toBe(true);

    for (const messages of [ar, en, de, tr]) {
      expect(messages.legal.privacyTitle).toBeTruthy();
      expect(messages.legal.imprintTitle).toBeTruthy();
      expect(messages.legal.reviewRequired).toBeTruthy();
      expect(messages.legal.accountDeletion).toBeTruthy();
      expect(messages.legal.notifications).toBeTruthy();
    }

    expect(source("app/privacy/page.tsx")).toContain("legal.reviewRequired");
    expect(source("app/imprint/page.tsx")).toContain("legal.providerPending");
  });

  it("applies app-wide security headers and disables caching on sensitive surfaces", () => {
    const config = source("next.config.ts");
    expect(config).toContain("Content-Security-Policy");
    expect(config).toContain("Strict-Transport-Security");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("https://*.supabase.co");
    expect(config).toContain("wss://*.supabase.co");
    expect(config).toContain("https://www.ashefaa.com");
    expect(config).toContain('"/admin/:path*"');
    expect(config).toContain('"/account/:path*"');
    expect(config).toContain('"/api/admin/:path*"');
    expect(config).toContain('"/api/account/:path*"');
    expect(config).toContain("private, no-store, max-age=0");
  });

  it("keeps privileged helpers behind server-only module boundaries", () => {
    for (const relativePath of [
      "lib/auth/admin-server.ts",
      "lib/supabase/server.ts",
      "lib/android-release-server.ts",
    ]) {
      expect(source(relativePath)).toContain('import "server-only";');
    }
    expect(source("lib/auth/admin-server.ts")).not.toContain('"use server"');
  });

  it("fails closed instead of publishing demo donation and payment content", () => {
    const donations = source("lib/data/donations.ts");
    expect(donations).not.toContain("demo-data");
    expect(donations).not.toContain("previewDonation");
    expect(donations).toContain("if (!client) return { ...DEFAULT_SETTINGS };");
    expect(donations).toContain("if (!client) return [];");
    expect(donations).toContain("if (!client) return emptyDonationReport();");
    expect(existsSync(path.join(process.cwd(), "lib/data/demo-data.ts"))).toBe(false);
  });

  it("documents current operations and explicit content gates without stale branding", () => {
    const readme = source("README.md");
    expect(readme).toContain("# Danube Mosque");
    expect(readme).toContain("CONTENT INPUT PENDING");
    expect(readme).toContain("Supabase `pg_cron`");
    expect(readme).toContain("native Android");
    expect(readme).toContain("`/privacy`");
    expect(readme).toContain("`/imprint`");
    expect(readme).not.toContain("trusted external scheduler");
  });

  it("retains safe service-worker update, offline, and private-route behavior", () => {
    const worker = source("public/sw.js");
    expect(worker).toContain("self.skipWaiting()");
    expect(worker).toContain("self.clients.claim()");
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain("caches.match(OFFLINE_URL)");
    expect(worker).toContain("isPrivateOrDataRequest(request)");
    expect(worker).toContain('request.method !== "GET"');
    expect(worker).toContain("PRECACHE_ASSETS.map((asset) => cache.add(asset))");
  });
});
