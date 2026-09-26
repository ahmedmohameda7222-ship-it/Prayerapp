import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pixelShiftForEpoch } from "../lib/pixel-shift";

const logicalNow = new Date("2026-09-18T10:34:56.000Z");

const watchdog = vi.hoisted(() => ({
  heartbeat: vi.fn(),
  shouldReload: vi.fn(() => false),
}));

vi.mock("../lib/runtime/watchdog", () => ({
  createWatchdog: () => watchdog,
}));

vi.mock("../lib/runtime/use-display-runtime", () => ({
  useDisplayRuntime: () => ({ logicalNow }),
}));

vi.mock("../components/DisplayShell", () => ({
  DisplayShell: ({
    diagnosticsEnabled,
    pixelShift,
  }: {
    diagnosticsEnabled?: boolean;
    pixelShift?: { x: number; y: number };
  }) => (
    <div
      data-testid="wired-display-shell"
      data-diagnostics={String(Boolean(diagnosticsEnabled))}
      data-shift={JSON.stringify(pixelShift)}
    />
  ),
}));

import Home from "./page";

describe("display app page wiring", () => {
  beforeEach(() => {
    watchdog.heartbeat.mockClear();
    watchdog.shouldReload.mockClear();
    window.history.replaceState({}, "", "/?diagnostics=1");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
    vi.useRealTimers();
  });

  it("resets the watchdog heartbeat synchronously when the display becomes visible again", async () => {
    render(<Home />);
    await waitFor(() => expect(watchdog.heartbeat).toHaveBeenCalled());
    watchdog.heartbeat.mockClear();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(watchdog.heartbeat).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(watchdog.heartbeat).toHaveBeenCalledTimes(1);
  });

  it("renders the real runtime shell and enables diagnostics from the query flag", async () => {
    render(<Home />);

    const shell = screen.getByTestId("wired-display-shell");
    await waitFor(() => expect(shell).toHaveAttribute("data-diagnostics", "true"));

    const epoch = Math.floor(logicalNow.getTime() / (10 * 60_000));
    expect(shell).toHaveAttribute(
      "data-shift",
      JSON.stringify(pixelShiftForEpoch(epoch)),
    );
  });
});
