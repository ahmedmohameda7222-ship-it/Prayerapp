import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import fixture from "../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import { DisplayShell } from "./DisplayShell";

afterEach(cleanup);

describe("entirely black prayer screen", () => {
  it("renders no header, clock, prayer rail, QR, banners, content, controls, diagnostics or TEST badge", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    const vm: DisplayRuntimeViewModel = {
      feed, logicalNow: new Date("2026-09-15T17:01:00+02:00"),
      state: { kind: "PRAYER_IN_PROGRESS", prayer: "asr", degraded: false, degradedReason: null },
      content: null, normalSlide: null, urgent: [],
      networkAvailable: false, usingLkg: true,
      prayerScheduleStale: true, publicAppUrl: feed.mosque.publicAppUrl,
    };
    const { container } = render(<DisplayShell vm={vm} testMode="PRAYER_IN_PROGRESS" diagnosticsEnabled />);
    expect(container).toHaveTextContent("");
    expect(screen.getByTestId("prayer-blackout")).toBeInTheDocument();
    expect(screen.queryByTestId("display-shell")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-prayer-dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("prayerapp-qr")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tv-test-badge")).not.toBeInTheDocument();
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(container.querySelectorAll("button, svg, header, footer, aside, p, span, h1, h2, h3, section")).toHaveLength(0);
    expect(screen.getByTestId("prayer-blackout")).toHaveStyle({
      backgroundColor: "#000000", position: "fixed", inset: "0",
    });
  });

  it("does not black out Friday Jumuah service", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    render(<DisplayShell vm={{
      feed, logicalNow: new Date("2026-09-18T13:15:00+02:00"),
      state: { kind: "JUMUAH_NOW", prayer: null, degraded: false, degradedReason: null, serviceId: "primary:2026-09-18", serviceIndex: 0 },
      content: null, normalSlide: null, urgent: [],
      networkAvailable: true, usingLkg: false,
      prayerScheduleStale: false, publicAppUrl: feed.mosque.publicAppUrl,
    }} />);
    expect(screen.queryByTestId("prayer-blackout")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
