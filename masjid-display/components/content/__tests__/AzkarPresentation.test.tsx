import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DisplayAzkarDto, MasjidDisplayFeedV1 } from "../../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../../lib/runtime/use-display-runtime";
import fixture from "../../../lib/__fixtures__/feed-v1.json";
import { PrayerStrip } from "../../PrayerStrip";
import { AzkarSlide } from "../AzkarSlide";

afterEach(cleanup);

function dhikr(category: DisplayAzkarDto["category"], arabicText: string): DisplayAzkarDto {
  return {
    id: "test-dhikr",
    category,
    arabicText,
    translationDe: "Ein Dhikr in deutscher Sprache",
    source: "Hisn al-Muslim",
    repeatCount: 3,
    sortOrder: 1,
  };
}

describe("TV Azkar presentation", () => {
  it("identifies after-prayer and Friday Azkar in Arabic and German", () => {
    const { rerender } = render(<AzkarSlide item={dhikr("After Prayer", "سبحان الله")} />);
    expect(screen.getByText("أذكار بعد الصلاة")).toBeInTheDocument();
    expect(screen.getByText("Dhikr nach dem Gebet")).toBeInTheDocument();
    rerender(<AzkarSlide item={dhikr("Friday", "سبحان الله")} />);
    expect(screen.getByText("أذكار الجمعة")).toBeInTheDocument();
    expect(screen.getByText("Freitags-Dhikr")).toBeInTheDocument();
  });

  it("marks long Arabic Azkar for a TV fitting strategy without clipping their full source text", () => {
    const value = "اللهم اهدنا إلى الصراط المستقيم ".repeat(22);
    const { container } = render(<AzkarSlide item={dhikr("Morning", value)} />);
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === value)).toBeInTheDocument();
    expect(container.querySelector(".azkar-slide")).toHaveClass("azkar-slide-long");
    expect(screen.getByText("Hisn al-Muslim")).toBeInTheDocument();
  });
  it("does not force both long-language paragraphs into the same TV frame", () => {
    const long = dhikr("Morning", "اللهم اهدنا ".repeat(45));
    long.translationDe = "Deutscher Text ".repeat(35);
    const { rerender } = render(<AzkarSlide item={long} language="ar" />);
    expect(screen.getByText((_, node) => node?.tagName === "P" && node.textContent === long.arabicText)).toBeInTheDocument();
    expect(screen.queryByText((_, node) => node?.tagName === "P" && node.textContent === long.translationDe)).not.toBeInTheDocument();

    rerender(<AzkarSlide item={long} language="de" />);
    expect(screen.getByText((_, node) => node?.tagName === "P" && node.textContent === long.translationDe)).toBeInTheDocument();
    expect(screen.queryByText((_, node) => node?.tagName === "P" && node.textContent === long.arabicText)).not.toBeInTheDocument();
  });

});

describe("TV Prayer Strip orientation", () => {
  it("highlights the next upcoming prayer without treating sunrise as an obligatory prayer", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    const vm = {
      feed,
      logicalNow: new Date("2026-09-15T15:04:00+02:00"),
      state: null,
      content: null,
      normalSlide: null,
      urgent: [],
      networkAvailable: true,
      usingLkg: false,
      prayerScheduleStale: false,
      publicAppUrl: feed.mosque.publicAppUrl,
    } satisfies DisplayRuntimeViewModel;
    render(<PrayerStrip vm={vm} />);
    expect(screen.getByTestId("prayer-cell-asr")).toHaveAttribute("data-next", "true");
    expect(screen.getByTestId("prayer-cell-sunrise")).not.toHaveAttribute("data-next", "true");
    expect(screen.getByTestId("prayer-cell-maghrib")).not.toHaveAttribute("data-next", "true");
  });
});
