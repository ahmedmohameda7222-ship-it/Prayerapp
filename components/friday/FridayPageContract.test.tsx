import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Friday public page contract", () => {
  it("uses a root-page header instead of the Home mosque identity header", () => {
    const page = source("app/friday/page.tsx");

    expect(page).toContain("RootPageHeader");
    expect(page).toContain('titleKey="friday.title"');
    expect(page).not.toContain("<AppHeader");
  });

  it("makes the image a live next-prayer surface using prayerTime only", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain("getFridayLivePrayer");
    expect(friday).toContain("friday-live-countdown");
    expect(friday).toContain("livePrayer.item.prayerTime");
    expect(friday).not.toContain("item.khutbahTime");
    expect(friday).not.toContain("item.khateebName");
  });

  it("keeps multiple published services dynamic and exposes the shared location inside the schedule", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain("schedule.items.length");
    expect(friday).toContain("localizedItems.map");
    expect(friday).toContain("friday-shared-details");
    expect(friday).toContain("sharedLocationAddress");
  });

  it("uses temporary preview rows only when the real Friday schedule is empty", () => {
    const page = source("app/friday/page.tsx");

    expect(page).toContain("getFridayPreviewMockData");
    expect(page).toContain("!loadFailed && jumuahTimes.length === 0");
  });

  it("uses a moving iOS glass selection with optimistic route motion", () => {
    const css = source("app/native-pwa.css");
    const nav = source("components/layout/BottomNav.tsx");

    expect(css).toContain(".bottom-nav-shell.bottom-nav-ios .bottom-nav-selection");
    expect(css).toContain("display: block");
    expect(css).toContain("translateX(calc(var(--nav-active-index, 0) * 100%))");
    expect(css).toContain("cubic-bezier(0.2, 1.28, 0.35, 1)");
    expect(css).toContain("prefers-reduced-motion");
    expect(nav).toContain("setPendingSelection");
    expect(nav).toContain("--nav-active-index");
    expect(nav).toContain("classList.add(`bottom-nav-${detected}`)");
  });

  it("keeps zoom available and enables safe-area viewport coverage", () => {
    const layout = source("app/layout.tsx");

    expect(layout).toContain('viewportFit: "cover"');
    expect(layout).not.toContain("maximumScale");
  });
});
