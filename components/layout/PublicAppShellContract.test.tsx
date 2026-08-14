import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Public PWA shell contract", () => {
  it("sets presentation-only platform and display-mode attributes", () => {
    const platform = source("components/providers/PlatformAttributes.tsx");
    const layout = source("app/layout.tsx");

    expect(layout).toContain("<PlatformAttributes />");
    expect(platform).toContain("root.dataset.platform = detectPlatform()");
    expect(platform).toContain("root.dataset.displayMode = detectDisplayMode()");
    expect(platform).toContain('"ios" | "android" | "other"');
    expect(platform).toContain('"standalone" | "browser"');
    expect(platform).not.toMatch(/fetch\(|getJumuahTimes|prayerTime|Supabase/);
  });

  it("allows zoom and opts into safe-area viewport coverage", () => {
    const layout = source("app/layout.tsx");
    const css = source("app/public-app-shell.css");

    expect(layout).not.toContain("maximumScale");
    expect(layout).not.toContain("userScalable: false");
    expect(layout).toContain('viewportFit: "cover"');
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("env(safe-area-inset-right)");
    expect(css).toContain("min-height: 100dvh");
  });

  it("uses separate iOS and Android navigation presentation instead of one glass style", () => {
    const css = source("app/public-app-shell.css");

    expect(css).toContain('html[data-platform="ios"] .bottom-nav-shell');
    expect(css).toContain('html[data-platform="android"] .bottom-nav-shell');
    expect(css).toContain("backdrop-filter: blur(22px) saturate(1.12)");
    expect(css).toContain("border-radius: 0");
    expect(css).toContain("min-height: 64px");
    expect(css).toContain("min-width: 48px");
    expect(css).toContain("min-height: 48px");
  });

  it("keeps Friday visibly active through canonical root-navigation semantics", () => {
    const nav = source("components/layout/BottomNav.tsx");

    expect(nav).toContain('{ href: "/friday", label: t("nav.friday")');
    expect(nav).toContain('aria-current={active ? "page" : undefined}');
    expect(nav).toContain("pathname === href || pathname.startsWith(`${href}/`)");
  });

  it("aligns installed PWA colors and prepares existing icons for maskable Android use", () => {
    const manifest = source("public/manifest.webmanifest");
    const layout = source("app/layout.tsx");
    const css = source("app/public-app-shell.css");

    expect(manifest).toContain('"background_color": "#f3efe7"');
    expect(manifest).toContain('"theme_color": "#173f34"');
    expect(manifest).toContain('"purpose": "maskable"');
    expect(layout).toContain('themeColor: "#173F34"');
    expect(css).toContain("--app-brand-strong: #173f34");
    expect(css).toContain("--app-canvas: #f3efe7");
  });

  it("preserves keyboard focus and reduced-motion behavior", () => {
    const css = source("app/public-app-shell.css");

    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("transition: none !important");
  });
});
