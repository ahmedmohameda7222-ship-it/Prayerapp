import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public navigation contract", () => {
  it("keeps public navigation persistent in the root layout instead of remounting it per page", () => {
    const layout = source("app/layout.tsx");
    const shell = source("components/layout/AppShell.tsx");
    const host = source("components/layout/PublicNavigation.tsx");

    expect(layout).toContain("<PublicNavigation />");
    expect(shell).not.toContain("<BottomNav");
    expect(host).toContain('HIDDEN_PREFIXES = ["/admin"]');
    expect(host).toContain('HIDDEN_ROUTES = new Set(["/offline"])');
  });

  it("fully prefetches the five root destinations for fast dynamic-route transitions", () => {
    const nav = source("components/layout/BottomNav.tsx");

    expect(nav).toContain('ROOT_NAV_HREFS = ["/", "/times", "/friday", "/news", "/more"]');
    expect(nav).toContain("router.prefetch(href)");
    expect(nav).toContain("prefetch={true}");
  });

  it("supports direct manipulation of the selected iOS glass tab without replacing tap navigation", () => {
    const nav = source("components/layout/BottomNav.tsx");
    const css = source("app/native-pwa.css");

    expect(nav).toContain("handleTrackPointerDown");
    expect(nav).toContain("handleTrackPointerMove");
    expect(nav).toContain("handleTrackPointerUp");
    expect(nav).toContain("setPointerCapture");
    expect(nav).toContain("router.push(target.href)");
    expect(nav).toContain('data-ios-dragging={dragPosition !== null ? "true" : undefined}');
    expect(css).toContain("touch-action: pan-y");
    expect(css).toContain('.bottom-nav-track[data-ios-dragging="true"] .bottom-nav-selection');
    expect(css).toContain("transition: none");
  });

  it("keeps iOS tab labels readable without dropping below the approved minimum", () => {
    const css = source("app/native-pwa.css");
    const iosSection = css.slice(
      css.indexOf('html[data-platform="ios"] .bottom-nav-link,'),
      css.indexOf('html[data-platform="android"] .bottom-nav-shell,'),
    );

    expect(iosSection).toContain("font-size: 12px;");
    expect(iosSection).not.toContain("font-size: 10.5px;");
  });
});
