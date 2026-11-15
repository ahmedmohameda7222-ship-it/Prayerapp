import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { DisplayShell } from "../DisplayShell";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, "data-testid": id }: { value: string; "data-testid"?: string }) => (
    <svg data-testid={id} data-qr-value={value} />
  ),
}));

const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
function vm(kind: DisplayRuntimeViewModel["state"] = { kind:"NORMAL", prayer:null, degraded:false, degradedReason:null }): DisplayRuntimeViewModel {
  return {
    feed,
    logicalNow: new Date("2026-09-15T14:40:00.000Z"),
    state: kind,
    content: null,
    normalSlide: null,
    urgent: [],
    networkAvailable: true,
    usingLkg: false,
    prayerScheduleStale: false,
    publicAppUrl: feed.mosque.publicAppUrl,
  };
}
afterEach(cleanup);

describe("approved 1920x1080 TV Layout V2 shell", () => {
  it("uses unified header, hero, six prayer rail and separate persistent app QR dock", () => {
    render(<DisplayShell vm={vm()} />);
    const shell = screen.getByTestId("display-shell");
    expect(shell).toHaveClass("tv-v2");
    const dock = within(shell).getByTestId("tv-prayer-dock");
    expect(within(dock).getAllByTestId(/^prayer-cell-/)).toHaveLength(6);
    expect(within(dock).getByTestId("prayerapp-qr")).toHaveAttribute(
      "data-qr-value", feed.mosque.publicAppUrl,
    );
    expect(screen.getByTestId("tv-hero")).toBeInTheDocument();
  });

  it("gives the rotating full-screen dhikr the whole hero, without prayer rail or app QR", () => {
    const postPrayerFeed = structuredClone(feed);
    postPrayerFeed.azkar = Array.from({ length: 18 }, (_, index) => ({
      id: `after-${index}`,
      category: "After Prayer" as const,
      arabicText: `ذكر ما بعد الصلاة ${index + 1}`,
      translationDe: `Dhikr nach dem Gebet ${index + 1}`,
      source: "Hisn al-Muslim",
      repeatCount: 1,
      sortOrder: index + 1,
    }));
    postPrayerFeed.displaySettings.azkarPlaylistIds = postPrayerFeed.azkar.map((item) => item.id);
    const { rerender } = render(<DisplayShell vm={{
      ...vm({ kind: "POST_PRAYER_AZKAR", prayer: "asr", degraded: false, degradedReason: null }),
      feed: postPrayerFeed,
      logicalNow: new Date("2026-09-15T17:10:30+02:00"),
    }} />);

    const shell = screen.getByTestId("display-shell");
    expect(shell).toHaveAttribute("data-display-mode", "post-prayer");
    expect(screen.getByTestId("after-prayer-board")).toHaveAttribute("data-density", "short");
    expect(screen.getAllByTestId("after-prayer-item")).toHaveLength(1);
    expect(screen.queryByTestId("tv-prayer-dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("prayerapp-qr")).not.toBeInTheDocument();
    expect(screen.getByTestId("tv-hero")).toBeInTheDocument();
    expect(screen.getByTestId("header-clock")).toBeInTheDocument();

    rerender(<DisplayShell vm={vm()} />);
    expect(screen.getByTestId("tv-prayer-dock")).toBeInTheDocument();
    expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^prayer-cell-/)).toHaveLength(6);
  });

  it("uses a full-screen dhikr slide without text truncation and larger television typography", () => {
    const css = readFileSync(path.join(process.cwd(), "app/tv-v2.css"), "utf8");
    expect(css).toContain('.tv-v2[data-display-mode="post-prayer"]');
    expect(css).toMatch(/\.tv-v2\[data-display-mode="post-prayer"\] \.after-active-ar\s*\{[^}]*font-size:\s*clamp\(/);
    expect(css).toMatch(/\.tv-v2\[data-display-mode="post-prayer"\] \.after-active-de\s*\{[^}]*font-size:\s*clamp\(/);
    expect(css).not.toMatch(/\.after-active-(ar|de)[^}]*-webkit-line-clamp/);
    expect(css).toMatch(/\.tv-v2 \.header-clock\s*\{[^}]*font-size:\s*clamp\(/);
    expect(css).toMatch(/\.tv-v2 \.prayer-iqama\s*\{[^}]*font-size:\s*clamp\(/);
  });

  it("shows a neutral loading composition until the first trusted Feed arrives", () => {
    render(<DisplayShell vm={{ ...vm(null), feed: null, prayerScheduleStale: true, publicAppUrl: null }} />);
    expect(screen.getByText("جاري تحميل شاشة المسجد")).toBeInTheDocument();
    expect(screen.getByText("Daten werden geladen")).toBeInTheDocument();
    expect(screen.queryByText(/UPDATE REQUIRED/)).not.toBeInTheDocument();
  });

  it("uses real next prayer data when NORMAL has no announcements or Azkar", () => {
    render(<DisplayShell vm={{ ...vm(), logicalNow: new Date("2026-09-15T08:00:00Z") }} />);
    expect(screen.getByText("الصلاة القادمة")).toBeInTheDocument();
    expect(screen.getByText("Nächstes Gebet")).toBeInTheDocument();
  });

  it("labels the prayer states with distinct V2 hero variants", () => {
    const variants = ["PRAYER_APPROACHING","PRAYER_TIME_NOW","WAITING_FOR_IQAMA","IQAMA_NOW","FRIDAY_MODE","JUMUAH_NOW"] as const;
    for (const kind of variants) {
      const { unmount } = render(<DisplayShell vm={vm({
        kind, prayer: kind.startsWith("FRIDAY") || kind === "JUMUAH_NOW" ? null : "asr",
        degraded: false, degradedReason: null, serviceId: "primary:2026-09-18", serviceIndex: 0,
      })} />);
      expect(screen.getByRole("main")).toHaveAttribute("data-layout", kind.toLowerCase().replaceAll("_","-"));
      unmount();
    }
  });
});
