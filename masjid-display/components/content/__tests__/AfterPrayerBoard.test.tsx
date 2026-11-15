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
    { id: "last", category: "After Prayer", arabicText: "سبحان الله", translationDe: "Gepriesen sei Allah", repeatCount: 33, sortOrder: 10, source: "Hisn al-Muslim 69" },
    { id: "first", category: "After Prayer", arabicText: "أستغفر الله", translationDe: "Ich bitte Allah um Vergebung", repeatCount: 3, sortOrder: 1, source: "Hisn al-Muslim 66" },
    { id: "unselected", category: "After Prayer", arabicText: "لا تظهر", translationDe: "Nicht zeigen", repeatCount: 1, sortOrder: 2, source: "Hisn al-Muslim" },
  ];
  feed.displaySettings.azkarPlaylistIds = ["last", "first"];
  return {
    feed,
    logicalNow: new Date("2026-09-15T17:10:30+02:00"),
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

describe("sequential, readable after-prayer TV dhikr", () => {
  it("renders only one full Arabic and German dhikr in source order", () => {
    const vm = viewModel();
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    const first = screen.getByTestId("after-prayer-item");
    expect(within(first).getByText("أستغفر الله")).toBeInTheDocument();
    expect(within(first).getByText("Ich bitte Allah um Vergebung")).toBeInTheDocument();
    expect(screen.queryByText("سبحان الله")).not.toBeInTheDocument();
    expect(screen.queryByText("لا تظهر")).not.toBeInTheDocument();
    expect(screen.getByTestId("after-prayer-position")).toHaveTextContent("1 / 2");
    expect(screen.getByTestId("after-prayer-remaining")).toHaveTextContent("00:18");

    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:10:48+02:00") }} />);
    expect(screen.getAllByTestId("after-prayer-item")).toHaveLength(1);
    expect(screen.getByText("سبحان الله")).toBeInTheDocument();
    expect(screen.getByText("Gepriesen sei Allah")).toBeInTheDocument();
    expect(screen.getByText("×33")).toBeInTheDocument();
    expect(screen.getByTestId("after-prayer-position")).toHaveTextContent("2 / 2");
    expect(screen.getByTestId("after-prayer-remaining")).toHaveTextContent("01:16");
  });

  it("ends the display at the calculated time, not at four minutes", () => {
    const vm = viewModel();
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:12:03+02:00") }} />);
    expect(screen.getByText("سبحان الله")).toBeInTheDocument();
    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:12:04+02:00") }} />);
    expect(screen.queryByTestId("after-prayer-board")).not.toBeInTheDocument();
  });

  it("uses separate large language pages for Ayat-al-Kursi-length text", () => {
    const vm = viewModel();
    vm.feed!.azkar = [{
      id: "long", category: "After Prayer",
      arabicText: Array(100).fill("الله").join(" "),
      translationDe: Array(180).fill("Allah").join(" "),
      repeatCount: 1, sortOrder: 1, source: "Hisn al-Muslim",
    }];
    vm.feed!.displaySettings.azkarPlaylistIds = ["long"];
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    expect(screen.getByTestId("after-prayer-item")).toHaveAttribute("data-language", "ar");
    expect(screen.queryByText(Array(180).fill("Allah").join(" "))).not.toBeInTheDocument();
    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:12:30+02:00") }} />);
    expect(screen.getByTestId("after-prayer-item")).toHaveAttribute("data-language", "de");
    expect(screen.getByText(Array(180).fill("Allah").join(" "))).toBeInTheDocument();
  });

  it("can rotate all 18 source items without rendering a truncated grid", () => {
    const vm = viewModel();
    const feed = vm.feed!;
    feed.azkar = Array.from({ length: 18 }, (_, index) => ({
      id: `a${index}`, category: "After Prayer" as const,
      arabicText: `ذكر كامل رقم ${index + 1}`,
      translationDe: `Vollständiger deutscher Dhikr ${index + 1}`,
      source: "Hisn al-Muslim", repeatCount: 1, sortOrder: index + 1,
    }));
    feed.displaySettings.azkarPlaylistIds = feed.azkar.map((a) => a.id);
    const { rerender } = render(<AfterPrayerBoard vm={vm} />);
    expect(screen.getAllByTestId("after-prayer-item")).toHaveLength(1);
    expect(screen.getByText("ذكر كامل رقم 1")).toBeInTheDocument();
    rerender(<AfterPrayerBoard vm={{ ...vm, logicalNow: new Date("2026-09-15T17:10:48+02:00") }} />);
    expect(screen.getByText("ذكر كامل رقم 2")).toBeInTheDocument();
    expect(screen.queryByText("ذكر كامل رقم 18")).not.toBeInTheDocument();
  });
});
