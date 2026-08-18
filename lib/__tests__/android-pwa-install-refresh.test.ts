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

  it("does not force the generated WebAPK prompt from the Android install CTA", () => {
    const homeInstall = source("components/home/HomeInstallAction.tsx");
    const settingsInstall = source("components/settings/InstallAppCard.tsx");

    expect(homeInstall).toContain("if (isAndroid())");
    expect(homeInstall).toContain("setAndroidGuideOpen(true)");
    expect(homeInstall).toContain('data-testid="android-add-to-home-dialog"');
    expect(homeInstall.indexOf("if (isAndroid())")).toBeLessThan(homeInstall.indexOf("currentPrompt.prompt()"));
    expect(settingsInstall).toContain("ANDROID_INSTALL_STEPS");
    expect(settingsInstall).toContain("if (!prompt || isAndroid) return;");
    expect(settingsInstall).toContain('data-testid="android-add-to-home-instructions"');
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
