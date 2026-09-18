import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pixelShiftForEpoch } from "../lib/pixel-shift";

const logicalNow = new Date("2026-09-18T10:34:56.000Z");

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
    window.history.replaceState({}, "", "/?diagnostics=1");
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
    vi.useRealTimers();
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
