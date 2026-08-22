import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Android PWA install and pull-to-refresh contracts", () => {
  it("keeps the web app manifest installable and standalone", () => {
    const manifest = JSON.parse(source("public/manifest.webmanifest")) as {
      display?: string;
      start_url?: string;
      scope?: string;
      icons?: Array<{ sizes?: string }>;
    };

    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.icons?.some((icon) => icon.sizes === "192x192")).toBe(true);
    expect(manifest.icons?.some((icon) => icon.sizes === "512x512")).toBe(true);
  });

  it("routes Android users to the permanent APK-named native application download", () => {
    const homeInstall = source("components/home/HomeInstallAction.tsx");
    const settingsInstall = source("components/settings/InstallAppCard.tsx");
    const release = source("lib/android-release.ts");

    expect(release).toContain('"/download/android/danube-mosque.apk"');
    expect(homeInstall).toContain("if (isAndroid())");
    expect(homeInstall).toContain("href={ANDROID_PUBLIC_DOWNLOAD_PATH}");
    expect(homeInstall).toContain("installed || isNative");
    expect(homeInstall.indexOf("if (isAndroid())")).toBeLessThan(homeInstall.indexOf("currentPrompt.prompt()"));
    expect(settingsInstall).toContain("href={ANDROID_PUBLIC_DOWNLOAD_PATH}");
    expect(settingsInstall).toContain("installed || isNative");
    expect(settingsInstall).not.toContain("ANDROID_INSTALL_STEPS");
  });

  it("enables pull-to-refresh only for touch standalone mode at the top of public pages", () => {
    const pull = source("components/providers/PullToRefresh.tsx");

    expect(pull).toContain('matchMedia("(display-mode: standalone)")');
    expect(pull).toContain("hasTouchInput()");
    expect(pull).toContain('pathname.startsWith("/admin")');
    expect(pull).toContain("window.scrollY > 0");
    expect(pull).toContain("event.preventDefault()");
    expect(pull).toContain("REFRESH_THRESHOLD = 76");
    expect(pull).toContain("window.location.reload()");
    expect(pull).toContain(".bottom-nav-shell");
  });

  it("contains native overscroll and refresh-indicator styling", () => {
    const layout = source("app/layout.tsx");
    const css = source("app/pull-to-refresh.css");

    expect(layout).toContain('import "./pull-to-refresh.css"');
    expect(layout).toContain("<PullToRefresh />");
    expect(css).toContain('html[data-pull-refresh="enabled"]');
    expect(css).toContain("overscroll-behavior-y: contain");
    expect(css).toContain("pwa-pull-refresh-indicator");
    expect(css).toContain("pwa-pull-refresh-spin");
  });
});
