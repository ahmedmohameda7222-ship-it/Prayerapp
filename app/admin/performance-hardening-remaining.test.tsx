import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("remaining performance hardening contracts", () => {
  it("bounds Prayer Times admin reads to a navigable fixed date window", () => {
    const page = source("app/admin/prayer-times/page.tsx");
    const data = source("lib/data/prayer-times.ts");

    expect(page).toContain("ADMIN_PRAYER_TIMES_WINDOW_DAYS");
    expect(page).toContain("shiftPrayerTimesWindow");
    expect(page).toContain("resetPrayerTimesWindow");
    expect(page).toContain("prayerTimesWindowLabel");
    expect(page).not.toContain("getPrayerTimes(true)");

    expect(data).toContain("PrayerTimesQueryOptions");
    expect(data).toContain('.gte("date"');
    expect(data).toContain('.lte("date"');
  });

  it("keeps the public-only runtime stack out of the /admin route boundary", () => {
    expect(existsSync("components/providers/RouteRuntimeBoundary.tsx")).toBe(true);
    expect(existsSync("components/providers/PublicRuntimeProviders.tsx")).toBe(true);

    const layout = source("app/layout.tsx");
    expect(layout).toContain("RouteRuntimeBoundary");
    for (const publicOnly of [
      "NativeAndroidProvider",
      "AndroidUpdateProvider",
      "AdhanAudioProvider",
      "AppPreferencesProvider",
      "ServiceWorkerRegistrar",
      "NotificationOptInPrompt",
      "PullToRefresh",
      "PublicNavigation",
      "PlatformChromeBootstrap",
      "AppLaunchScreen",
    ]) {
      expect(layout).not.toContain(`import { ${publicOnly}`);
    }

    if (existsSync("components/providers/RouteRuntimeBoundary.tsx")) {
      const boundary = source("components/providers/RouteRuntimeBoundary.tsx");
      expect(boundary).toContain('pathname.startsWith("/admin")');
      expect(boundary).toContain("PublicRuntimeProviders");
    }
  });

  it("exposes Prayer Engine from the admin sidebar with all supported translations", () => {
    const sidebar = source("components/layout/AdminSidebar.tsx");
    expect(sidebar).toContain('href: "/admin/prayer-engine"');
    expect(sidebar).toContain('labelKey: "admin.prayerEngine"');

    for (const locale of ["en", "de", "tr", "ar"]) {
      const messages = JSON.parse(source(`messages/${locale}.json`)) as {
        admin?: Record<string, unknown>;
      };
      expect(messages.admin?.prayerEngine).toBeTruthy();
    }
  });

  it("deduplicates repeated request-locale resolution within one render request", () => {
    const layout = source("app/layout.tsx");
    expect(layout).toContain('import { cache } from "react";');
    expect(layout).toContain("const resolveRequestLocale = cache(async () =>");
  });

  it("records url.parse deprecation ownership instead of changing prayer delivery behavior", () => {
    const evidence = source("docs/performance/2026-10-06-admin-app-performance-hardening.md");
    expect(evidence).toContain("url.parse()");
    expect(evidence).toContain("web-push");
    expect(evidence).toContain("3.6.7");
    expect(evidence.toLowerCase()).toContain("dependency-owned");
  });
});
