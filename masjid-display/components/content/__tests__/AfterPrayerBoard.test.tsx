import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import fixture from "../../../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../../lib/runtime/use-display-runtime";
import { AfterPrayerBoard } from "../AfterPrayerBoard";

afterEach(cleanup);

function viewModel(): DisplayRuntimeViewModel {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  feed.azkar = [
    { id: "last", category: "After Prayer", arabicText: "الحمد لله", translationDe: "Alles Lob gebührt Allah", repeatCount: 33, sortOrder: 10, source: "Hisn al-Muslim 69" },
    { id: "first", category: "After Prayer", arabicText: "أستغفر الله", translationDe: "Ich bitte Allah um Vergebung", repeatCount: 3, sortOrder: 1, source: "Hisn al-Muslim 66" },
    { id: "unselected", category: "After Prayer", arabicText: "لا تظهر", translationDe: "Nicht zeigen", repeatCount: 1, sortOrder: 2, source: "Hisn al-Muslim" },
  ];
  feed.displaySettings.azkarPlaylistIds = ["last", "first"];
  return {
    feed,
    logicalNow: new Date("2026-09-15T17:11:00+02:00"),
    state: { kind: "POST_PRAYER_AZKAR", prayer: "asr", degraded: false, degradedReason: null },
    content: null,
    normalSlide: null,
    urgent: [],
    networkAvailable: true,
    usingLkg: false,
    prayerScheduleStale: false,
    publicAppUrl: feed.mosque.publicAppUrl,
  };
}

describe("approved static After Prayer TV board", () => {
  it("shows every selected item once, by Hisn al-Muslim order, without rotating slides", () => {
    const vm = viewModel();
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    const cards = screen.getAllByTestId("after-prayer-item");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("أستغفر الله")).toBeInTheDocument();
    expect(within(cards[1]).getByText("الحمد لله")).toBeInTheDocument();
    expect(screen.queryByText("لا تظهر")).not.toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();

    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:13:59+02:00") }} />);
    expect(screen.getAllByTestId("after-prayer-item")).toHaveLength(2);
    expect(screen.getByText("أستغفر الله")).toBeInTheDocument();
  });

  it("shows the correct remaining time against the absolute end of the congregational window", () => {
    render(<AfterPrayerBoard vm={viewModel()} />);
    expect(screen.getByTestId("after-prayer-remaining")).toHaveTextContent("03:00");
  });

  it("retains full Arabic and German text in source and supports a dense index of up to 18 items", () => {
    const vm = viewModel();
    const feed = vm.feed!;
    feed.azkar = Array.from({ length: 18 }, (_, index) => ({
      id: `a${index}`,
      category: "After Prayer" as const,
      arabicText: `ذكر كامل رقم ${index + 1}`,
      translationDe: `Vollständiger deutscher Dhikr ${index + 1}`,
      source: "Hisn al-Muslim",
      repeatCount: 1,
      sortOrder: index + 1,
    }));
    feed.displaySettings.azkarPlaylistIds = feed.azkar.map((a) => a.id);
    render(<AfterPrayerBoard vm={vm} />);
    expect(screen.getAllByTestId("after-prayer-item")).toHaveLength(18);
    expect(screen.getByTestId("after-prayer-board")).toHaveAttribute("data-density", "full");
    expect(screen.getByText("ذكر كامل رقم 18")).toBeInTheDocument();
  });
});
