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

  it("keeps Android web direct APK install distinct from native Android and non-Android PWA install", () => {
    const homeInstall = source("components/home/HomeInstallAction.tsx");
    const settingsInstall = source("components/settings/InstallAppCard.tsx");
    const release = source("lib/android-release.ts");
    const platform = source("lib/platform.ts");

    expect(release).toContain('\"/download/android/danube-mosque.apk\"');

    expect(homeInstall).toContain('import { ANDROID_PUBLIC_DOWNLOAD_PATH } from "@/lib/android-release"');
    expect(homeInstall).toContain('import { isAndroidUserAgent } from "@/lib/platform"');
    expect(homeInstall).toContain("setAndroidBrowser(isAndroidUserAgent(navigator.userAgent))");
    expect(homeInstall).toContain("if (!ready || installed || isNative) return null");
    expect(homeInstall).toContain("if (androidBrowser)");
    expect(homeInstall).toContain("href={ANDROID_PUBLIC_DOWNLOAD_PATH}");
    expect(homeInstall).toContain("currentPrompt.prompt()");
    expect(homeInstall).toContain('window.location.assign("/settings#install-app")');
    expect(platform).toContain("/\\bAndroid\\b/iu.test(userAgent)");

    expect(settingsInstall).toContain('data-testid="install-pwa"');
    expect(settingsInstall).toContain('data-testid="install-android-app"');
    expect(settingsInstall).toContain("installCopy.webApp");
    expect(settingsInstall).toContain("installCopy.androidApp");
    expect(settingsInstall).toContain("href={ANDROID_PUBLIC_DOWNLOAD_PATH}");
    expect(settingsInstall).not.toContain("prompt && !isAndroid");
    expect(settingsInstall).toContain("!isNative && isAndroid");
    expect(settingsInstall).not.toContain("!appInstalled && isAndroid");
    expect(settingsInstall).toContain("installed || isNative");
  });

  it("localizes the two Android install choices in every supported locale", () => {
    const settingsInstall = source("components/settings/InstallAppCard.tsx");

    expect(settingsInstall).toContain("const INSTALL_COPY");
    expect(settingsInstall).toContain("const installCopy = INSTALL_COPY[locale]");
    for (const locale of ["ar", "de", "en", "tr"]) {
      expect(settingsInstall).toContain(`${locale}: {`);
    }
    expect(settingsInstall).toContain("webApp:");
    expect(settingsInstall).toContain("androidApp:");
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
