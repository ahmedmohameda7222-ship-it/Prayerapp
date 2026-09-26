import { cleanup, render, screen } from "@testing-library/react";
import fixture from "../../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { afterEach, describe, expect, it } from "vitest";
import { DiagnosticsPanel } from "../DiagnosticsPanel";
import { StatusOverlay } from "../StatusOverlay";
import { TestModeBadge } from "../TestModeBadge";

const feed = structuredClone(fixture) as MasjidDisplayFeedV1;

function vm(overrides: Partial<DisplayRuntimeViewModel> = {}): DisplayRuntimeViewModel {
  return {
    feed,
    logicalNow: new Date("2026-09-18T10:34:56.000Z"),
    state: {
      kind: "NORMAL",
      prayer: null,
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

afterEach(cleanup);

describe("Plan 4 operational UI", () => {
  it("renders the exact bilingual Test Mode badge", () => {
    render(<TestModeBadge />);
    expect(screen.getByTestId("test-mode-badge")).toHaveTextContent(
      "TEST MODE / وضع الاختبار",
    );
  });

  it("shows non-blocking offline status while prayer coverage is still valid", () => {
    render(
      <StatusOverlay
        networkAvailable={false}
        usingLkg={true}
        prayerScheduleStale={false}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/OFFLINE/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("promotes stale prayer coverage to an update-required alert", () => {
    render(
      <StatusOverlay
        networkAvailable={false}
        usingLkg={true}
        prayerScheduleStale
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/UPDATE REQUIRED/i);
    expect(alert).toHaveTextContent(/يلزم التحديث/);
  });

  it("shows read-only diagnostics without secrets or controls", () => {
    render(
      <DiagnosticsPanel
        enabled
        vm={vm({
          diagnostics: {
            lastAttemptAt: "2026-09-18T10:34:00.000Z",
            lastSyncAt: "2026-09-18T10:33:59.000Z",
            clockOffsetMs: -5000,
            validationError: null,
          },
        })}
      />,
    );

    const panel = screen.getByTestId("diagnostics-panel");
    expect(panel).toHaveTextContent("Schema");
    expect(panel).toHaveTextContent("1");
    expect(panel).toHaveTextContent(feed.snapshotRevision);
    expect(panel).toHaveTextContent("NORMAL");
    expect(panel).toHaveTextContent("-5000");
    expect(panel).not.toHaveTextContent(/PRAYERAPP_ORIGIN|SUPABASE|SECRET/i);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render diagnostics unless explicitly enabled", () => {
    render(<DiagnosticsPanel enabled={false} vm={vm()} />);
    expect(screen.queryByTestId("diagnostics-panel")).not.toBeInTheDocument();
  });
});
