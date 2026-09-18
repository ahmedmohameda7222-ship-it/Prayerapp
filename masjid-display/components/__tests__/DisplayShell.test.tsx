import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { DisplayShell } from "../DisplayShell";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({
    value,
    title,
    "data-testid": testId,
  }: {
    value: string;
    title?: string;
    "data-testid"?: string;
    [key: string]: unknown;
  }) => <svg data-testid={testId} aria-label={title ?? value} data-qr-value={value} />,
}));

const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
const fridayNoon = new Date("2026-09-18T10:34:56.000Z");

function vm(overrides: Partial<DisplayRuntimeViewModel> = {}): DisplayRuntimeViewModel {
  return {
    feed,
    logicalNow: fridayNoon,
    state: {
      kind: "PRAYER_APPROACHING",
      prayer: "asr",
      degraded: false,
      degradedReason: null,
    },
    content: null,
    normalSlide: null,
    urgent: [],
    networkAvailable: true,
    usingLkg: false,
    prayerScheduleStale: false,
    testMode: false,
    testPayload: null,
    publicAppUrl: feed.mosque.publicAppUrl,
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("DisplayShell", () => {
  it("keeps the Prayerapp QR mounted across prayer and test states", () => {
    const { rerender } = render(<DisplayShell vm={vm()} />);
    expect(screen.getByTestId("prayerapp-qr")).toHaveAttribute(
      "data-qr-value",
      feed.mosque.publicAppUrl,
    );

    rerender(
      <DisplayShell
        vm={vm({
          state: {
            kind: "IQAMA_NOW",
            prayer: "asr",
            degraded: false,
            degradedReason: null,
          },
          testMode: true,
          testPayload: { scenario: "iqama_now", id: "test-iqama", prayer: "asr" },
        })}
      />,
    );
    expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
    expect(screen.getByText(/TEST MODE/i)).toBeInTheDocument();
  });

  it("renders corrected clock plus Gregorian and Hijri date regions", () => {
    render(<DisplayShell vm={vm()} />);
    expect(screen.getByTestId("header-clock")).toHaveTextContent("12:34:56");
    expect(screen.getByTestId("gregorian-date")).not.toBeEmptyDOMElement();
    expect(screen.getByTestId("hijri-date")).not.toBeEmptyDOMElement();
    expect(screen.getByText(feed.mosque.nameDe)).toBeInTheDocument();
    expect(screen.getByText(feed.mosque.nameAr)).toBeInTheDocument();
  });

  it("renders six prayer entries and gives Friday Dhuhr Jumuah semantics without Dhuhr Iqama", () => {
    render(<DisplayShell vm={vm()} />);
    expect(screen.getAllByTestId(/^prayer-cell-/)).toHaveLength(6);
    expect(screen.getByTestId("prayer-sunrise")).toHaveAttribute("data-informational", "true");

    const dhuhr = screen.getByTestId("prayer-dhuhr");
    expect(within(dhuhr).getByText(/Jumuah/i)).toBeInTheDocument();
    expect(within(dhuhr).getByText(/الجمعة/)).toBeInTheDocument();
    expect(within(dhuhr).queryByText(/Iqama/i)).not.toBeInTheDocument();
  });

  it("omits the urgent bar when empty and shows production urgent content when present", () => {
    const urgent = feed.announcements[0];
    const { rerender } = render(<DisplayShell vm={vm()} />);
    expect(screen.queryByTestId("urgent-bar")).not.toBeInTheDocument();

    rerender(<DisplayShell vm={vm({ urgent: [urgent] })} />);
    expect(screen.getByTestId("urgent-bar")).toBeInTheDocument();
    expect(screen.getByText(urgent.titleAr)).toBeInTheDocument();
    expect(screen.getByText(urgent.titleDe)).toBeInTheDocument();
  });

  it("hides the QR instead of inventing one when the canonical URL is unavailable", () => {
    render(<DisplayShell vm={vm({ publicAppUrl: null })} />);
    expect(screen.queryByTestId("prayerapp-qr")).not.toBeInTheDocument();
  });

  it("uses fluid/container layout rules without physical-device media queries", () => {
    const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.display-shell\s*\{/);
    expect(css).toMatch(/container-type:\s*size/);
    expect(css).toMatch(/clamp\(/);
    expect(css).toMatch(/@container/);
    expect(css).not.toMatch(/@media[^\{]*(?:\d+(?:\.\d+)?)(?:in|cm|mm|pt|pc)/i);
  });
});
