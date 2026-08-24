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

  it("keeps Android PWA install distinct from native Android app install", () => {
    const homeInstall = source("components/home/HomeInstallAction.tsx");
    const settingsInstall = source("components/settings/InstallAppCard.tsx");
    const release = source("lib/android-release.ts");

    expect(release).toContain('\"/download/android/danube-mosque.apk\"');

    expect(homeInstall).toContain("currentPrompt.prompt()");
    expect(homeInstall).toContain('window.location.assign("/settings#install-app")');
    expect(homeInstall).not.toContain("href={ANDROID_PUBLIC_DOWNLOAD_PATH}");
    expect(homeInstall).not.toContain("if (isAndroid())");

    expect(settingsInstall).toContain('data-testid="install-pwa"');
    expect(settingsInstall).toContain('data-testid="install-android-app"');
    expect(settingsInstall).toContain('t("settings.installWebApp")');
    expect(settingsInstall).toContain('t("settings.installAndroidApp")');
    expect(settingsInstall).toContain("href={ANDROID_PUBLIC_DOWNLOAD_PATH}");
    expect(settingsInstall).not.toContain("prompt && !isAndroid");
    expect(settingsInstall).toContain("!isNative && isAndroid");
    expect(settingsInstall).not.toContain("!appInstalled && isAndroid");
    expect(settingsInstall).toContain("installed || isNative");
  });

  it("localizes the two Android install choices in every supported locale", () => {
    for (const locale of ["ar", "de", "en", "tr"]) {
      const messages = JSON.parse(source(`messages/${locale}.json`)) as {
        settings?: { installWebApp?: string; installAndroidApp?: string };
      };

      expect(messages.settings?.installWebApp).toBeTruthy();
      expect(messages.settings?.installAndroidApp).toBeTruthy();
    }
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
