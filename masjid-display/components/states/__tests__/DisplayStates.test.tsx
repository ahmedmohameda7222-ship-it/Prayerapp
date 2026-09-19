import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../lib/__fixtures__/feed-v1.json";
import { activeDisplayContent } from "../../../lib/content-eligibility";
import type { MasjidDisplayFeedV1 } from "../../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../../lib/runtime/use-display-runtime";
import { DisplayShell } from "../../DisplayShell";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, ...props }: { value: string; [key: string]: unknown }) => (
    <svg {...props} data-qr-value={value} />
  ),
}));

function cloneFeed(): MasjidDisplayFeedV1 {
  return structuredClone(fixture) as MasjidDisplayFeedV1;
}

function vm(
  logicalNow: Date,
  overrides: Partial<DisplayRuntimeViewModel> = {},
): DisplayRuntimeViewModel {
  const feed = (overrides.feed ?? cloneFeed()) as MasjidDisplayFeedV1;
  return {
    feed,
    logicalNow,
    state: {
      kind: "NORMAL",
      prayer: null,
      degraded: false,
      degradedReason: null,
    },
    content: activeDisplayContent(feed, logicalNow),
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

describe("Display religious state renderers", () => {
  it("renders Iqama Now bilingually and suppresses the normal rotating slide", () => {
    const now = new Date("2026-09-15T14:55:00.000Z");
    render(
      <DisplayShell
        vm={vm(now, {
          state: {
            kind: "IQAMA_NOW",
            prayer: "asr",
            degraded: false,
            degradedReason: null,
          },
          normalSlide: { kind: "EVENT", itemId: "test-event-current" },
        })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText(/Iqama/i)).toBeInTheDocument();
    expect(within(main).getByText(/إقامة الصلاة/)).toBeInTheDocument();
    expect(within(main).queryByText("Aktuelle Veranstaltung")).not.toBeInTheDocument();
  });

  it("renders Prayer In Progress and keeps normal rotation suspended", () => {
    const now = new Date("2026-09-15T15:05:00.000Z");
    render(
      <DisplayShell
        vm={vm(now, {
          state: {
            kind: "PRAYER_IN_PROGRESS",
            prayer: "asr",
            degraded: false,
            degradedReason: null,
          },
          normalSlide: { kind: "CAMPAIGN", itemId: "test-campaign-active-url" },
        })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText(/Gebet läuft/i)).toBeInTheDocument();
    expect(within(main).getByText(/الصلاة قائمة/)).toBeInTheDocument();
    expect(within(main).queryByText("Spendenkampagne")).not.toBeInTheDocument();
  });

  it("renders prayer-approaching countdown from logical time to the stored prayer instant", () => {
    const now = new Date("2026-09-15T14:40:00.000Z");
    render(
      <DisplayShell
        vm={vm(now, {
          state: {
            kind: "PRAYER_APPROACHING",
            prayer: "asr",
            degraded: false,
            degradedReason: null,
          },
        })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText("Asr")).toBeInTheDocument();
    expect(within(main).getByText("العصر")).toBeInTheDocument();
    expect(within(main).getByTestId("state-target-time")).toHaveTextContent("16:45");
    expect(within(main).getByTestId("state-countdown")).toHaveTextContent("05:00");
  });

  it("renders waiting-for-Iqama countdown to prayer plus the shared delay", () => {
    const now = new Date("2026-09-15T14:50:00.000Z");
    render(
      <DisplayShell
        vm={vm(now, {
          state: {
            kind: "WAITING_FOR_IQAMA",
            prayer: "asr",
            degraded: false,
            degradedReason: null,
          },
        })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText(/Iqama in/i)).toBeInTheDocument();
    expect(within(main).getByText(/الإقامة بعد/)).toBeInTheDocument();
    expect(within(main).getByTestId("state-target-time")).toHaveTextContent("17:00");
    expect(within(main).getByTestId("state-countdown")).toHaveTextContent("10:00");
  });

  it("renders primary and additional Friday services with their canonical targets", () => {
    const primaryNow = new Date("2026-09-18T10:30:00.000Z");
    const { rerender } = render(
      <DisplayShell
        vm={vm(primaryNow, {
          state: {
            kind: "FRIDAY_MODE",
            prayer: null,
            degraded: false,
            degradedReason: null,
            serviceId: "primary:2026-09-18",
            serviceIndex: 0,
          },
        })}
      />,
    );

    let main = screen.getByRole("main");
    expect(within(main).getByText(/Jumuah 1/i)).toBeInTheDocument();
    expect(within(main).getByText(/الجمعة/)).toBeInTheDocument();
    expect(within(main).getByTestId("state-target-time")).toHaveTextContent("13:10");

    const additionalNow = new Date("2026-09-18T12:55:00.000Z");
    rerender(
      <DisplayShell
        vm={vm(additionalNow, {
          state: {
            kind: "FRIDAY_MODE",
            prayer: null,
            degraded: false,
            degradedReason: null,
            serviceId: "test-jumuah-2-2026-09-18",
            serviceIndex: 1,
          },
        })}
      />,
    );

    main = screen.getByRole("main");
    expect(within(main).getByText(/Jumuah 2/i)).toBeInTheDocument();
    expect(within(main).getByTestId("state-target-time")).toHaveTextContent("15:00");
    expect(within(main).getByTestId("state-countdown")).toHaveTextContent("05:00");
  });

  it("renders Jumuah Now without inventing an Iqama lifecycle", () => {
    const now = new Date("2026-09-18T13:00:00.000Z");
    render(
      <DisplayShell
        vm={vm(now, {
          state: {
            kind: "JUMUAH_NOW",
            prayer: null,
            degraded: false,
            degradedReason: null,
            serviceId: "test-jumuah-2-2026-09-18",
            serviceIndex: 1,
          },
        })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText(/Jumuah jetzt/i)).toBeInTheDocument();
    expect(within(main).getByText(/صلاة الجمعة الآن/)).toBeInTheDocument();
    expect(within(main).queryByText(/Iqama/i)).not.toBeInTheDocument();
  });
});
