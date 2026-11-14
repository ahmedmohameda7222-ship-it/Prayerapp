import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("labels the prayer states with distinct V2 hero variants", () => {
    const variants = ["PRAYER_APPROACHING","PRAYER_TIME_NOW","WAITING_FOR_IQAMA","IQAMA_NOW","PRAYER_IN_PROGRESS","FRIDAY_MODE","JUMUAH_NOW"] as const;
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
