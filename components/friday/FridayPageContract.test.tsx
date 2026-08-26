import { existsSync, readFileSync } from "node:fs";
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

  it("derives the schedule from published prayer times plus optional additional rows", () => {
    const page = source("app/friday/page.tsx");
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(page).toContain("getPrayerTimes(false");
    expect(page).toContain("getJumuahTimes()");
    expect(page).toContain("Promise.allSettled");
    expect(friday).toContain("resolveUpcomingFridaySchedule");
    expect(friday).toContain("prayerTimes");
    expect(friday).toContain("jumuahTimes");
  });

  it("keeps Primary renderable when additional Jumuah loading fails", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain("additionalTimesLoadFailed");
    expect(friday).toContain("prayerTimesLoadFailed");
    expect(friday).not.toContain("if (additionalTimesLoadFailed)");
  });

  it("loads a published khutbah independently after resolving the displayed Friday", () => {
    const page = source("app/friday/page.tsx");

    expect(page).toContain("resolveUpcomingFridaySchedule");
    expect(page).toContain("getFridayKhutbahByDate");
    expect(page).toContain("khutbahLoadFailed");
    expect(page).toContain("fridayKhutbah={fridayKhutbah}");
    expect(page).toContain("khutbahLoadFailed={khutbahLoadFailed}");
  });

  it("shows exactly one Friday-level CTA only for the published khutbah matching the displayed Friday", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain('readKhutbah: "قراءة الخطبة"');
    expect(friday).toContain('readKhutbah: "Read Khutbah"');
    expect(friday).toContain('readKhutbah: "Predigt lesen"');
    expect(friday).toContain('readKhutbah: "Hutbeyi oku"');
    expect(friday).toContain('data-testid="friday-khutbah-cta"');
    expect(friday).toContain("fridayKhutbah?.published");
    expect(friday).toContain("fridayKhutbah.date === schedule.date");
    expect(friday).toContain('href={`/friday/khutbah/${schedule.date}`}');
    expect(friday).not.toContain("Khutbah coming soon");
  });

  it("keeps khutbah load failure isolated from the Friday schedule", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain("khutbahLoadFailed");
    expect(friday).toContain("data-khutbah-load-failed");
    expect(friday).not.toContain("if (khutbahLoadFailed)");
  });

  it("protects the dedicated reader route with the published-only data layer", () => {
    const route = "app/friday/khutbah/[date]/page.tsx";
    expect(existsSync(join(process.cwd(), route))).toBe(true);
    if (!existsSync(join(process.cwd(), route))) return;

    const page = source(route);
    expect(page).toContain("getFridayKhutbahByDate(date)");
    expect(page).toContain("notFound()");
    expect(page).toContain("FridayKhutbahReader");
    expect(page).not.toContain("includeUnpublished");
  });

  it("makes the image a live next-prayer surface using prayerTime only", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain("getFridayLivePrayer");
    expect(friday).toContain("friday-live-countdown");
    expect(friday).toContain("livePrayer.item.prayerTime");
    expect(friday).not.toContain("item.khutbahTime");
    expect(friday).not.toContain("item.khateebName");
  });

  it("isolates clock values from RTL Arabic copy", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain("countdownParts");
    expect(friday).toContain('<bdi dir="ltr"');
    expect(friday).toContain("[unicode-bidi:isolate]");
    expect(friday).not.toContain('<span dir="ltr">{countdown}</span>');
  });

  it("numbers Primary as service one even when it is the only service", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain('return `Jumu\'ah ${index + 1}`');
    expect(friday).toContain('const labels = ["الجمعة الأولى", "الجمعة الثانية", "الجمعة الثالثة"]');
    expect(friday).not.toContain("if (total === 1)");
  });

  it("keeps multiple services dynamic and exposes available additional metadata", () => {
    const friday = source("components/friday/FridayPageClient.tsx");

    expect(friday).toContain("localizedItems.map");
    expect(friday).toContain("serviceLabel(locale, index)");
    expect(friday).toContain("schedule.nextIndex");
    expect(friday).toContain("friday-shared-details");
    expect(friday).toContain("sharedLocationAddress");
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
