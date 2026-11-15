import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import fixture from "../../../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../../../lib/feed-types";
import { getPostPrayerPlaylist } from "../../../lib/post-prayer-playlist";
import type { DisplayRuntimeViewModel } from "../../../lib/runtime/use-display-runtime";
import { AfterPrayerBoard } from "../AfterPrayerBoard";

afterEach(cleanup);

function viewModel(): DisplayRuntimeViewModel {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  feed.azkar = [
    { id: "later", category: "After Prayer", arabicText: "الحمد لله", translationDe: "Alles Lob gebührt Allah", repeatCount: 33, sortOrder: 10, source: "Hisn al-Muslim 69" },
    { id: "first", category: "After Prayer", arabicText: "أستغفر الله", translationDe: "Ich bitte Allah um Vergebung", repeatCount: 3, sortOrder: 1, source: "Hisn al-Muslim 66" },
    { id: "unselected", category: "After Prayer", arabicText: "لا تظهر", translationDe: "Nicht zeigen", repeatCount: 1, sortOrder: 2, source: "Hisn al-Muslim" },
  ];
  feed.displaySettings.azkarPlaylistIds = ["later", "first"];
  return {
    feed,
    logicalNow: new Date("2026-09-15T17:10:30+02:00"),
    state: { kind: "POST_PRAYER_AZKAR", prayer: "asr", degraded: false, degradedReason: null },
    content: null, normalSlide: null, urgent: [],
    networkAvailable: true, usingLkg: false,
    prayerScheduleStale: false, publicAppUrl: feed.mosque.publicAppUrl,
  };
}

describe("large rotating after-prayer reading slide", () => {
  it("shows only the first source-ordered dhikr, then rotates to the next after its reading time", () => {
    const vm = viewModel();
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    const first = screen.getByTestId("after-prayer-item");
    expect(first).toHaveAttribute("data-item-id", "first");
    expect(within(first).getByText("أستغفر الله")).toBeInTheDocument();
    expect(within(first).getByText("Ich bitte Allah um Vergebung")).toBeInTheDocument();
    expect(screen.queryByText("الحمد لله")).not.toBeInTheDocument();
    expect(screen.queryByText("لا تظهر")).not.toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getByTestId("after-prayer-progress")).toHaveTextContent("01 / 02");
    expect(screen.getByTestId("after-slide-remaining")).toHaveTextContent("00:11");

    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:10:41+02:00") }} />);
    const second = screen.getByTestId("after-prayer-item");
    expect(second).toHaveAttribute("data-item-id", "later");
    expect(within(second).getByText("الحمد لله")).toBeInTheDocument();
    expect(screen.queryByText("أستغفر الله")).not.toBeInTheDocument();
    expect(screen.getByText("×33")).toBeInTheDocument();
    expect(screen.getByTestId("after-prayer-progress")).toHaveTextContent("02 / 02");
    expect(screen.getAllByTestId("after-prayer-item")).toHaveLength(1);
  });

  it("shows the correct calculated overall remaining time and ends exactly after the playlist", () => {
    const vm = viewModel();
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    expect(screen.getByTestId("after-prayer-remaining")).toHaveTextContent("01:03");
    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:11:32+02:00") }} />);
    expect(screen.getByTestId("after-prayer-remaining")).toHaveTextContent("00:01");
    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:11:33+02:00") }} />);
    expect(screen.queryByTestId("after-prayer-board")).not.toBeInTheDocument();
  });

  it("reads long text with full-width Arabic then German pages, never a dense grid", () => {
    const vm = viewModel();
    const feed = vm.feed!;
    const arabic = Array.from({ length: 85 }, (_, i) => `ذكر${i}`).join(" ");
    const german = Array.from({ length: 120 }, (_, i) => `Wort${i}`).join(" ");
    feed.azkar = [{ id:"long",category:"After Prayer",arabicText:arabic,translationDe:german,source:"Hisn al-Muslim",repeatCount:1,sortOrder:1 }];
    feed.displaySettings.azkarPlaylistIds = ["long"];
    const playlist = getPostPrayerPlaylist(feed, "asr");
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    expect(screen.getByTestId("after-prayer-item")).toHaveAttribute("data-language", "ar");
    expect(screen.queryByText(german)).not.toBeInTheDocument();
    expect(screen.queryByTestId("after-grid")).not.toBeInTheDocument();

    const arabicDuration = playlist.slides.filter((slide) => slide.language === "ar")
      .reduce((sum, slide) => sum + slide.durationMs, 0);
    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date(vm.logicalNow.getTime() + arabicDuration) }} />);
    expect(screen.getByTestId("after-prayer-item")).toHaveAttribute("data-language", "de");
    expect(screen.getByTestId("after-prayer-item").querySelector('[lang="ar"]')).toBeNull();
  });
});
