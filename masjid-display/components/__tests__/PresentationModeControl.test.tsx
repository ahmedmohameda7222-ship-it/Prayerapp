import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PresentationModeControl } from "../PresentationModeControl";

let fullscreenElement: Element | null = null;

function installFullscreenApi(
  requestFullscreen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreenElement,
  });
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: requestFullscreen,
  });
  return requestFullscreen;
}

afterEach(() => {
  cleanup();
  fullscreenElement = null;
  delete (document as Document & { fullscreenElement?: Element | null }).fullscreenElement;
  delete (document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> })
    .requestFullscreen;
});

describe("PresentationModeControl", () => {
  it("shows a native setup button while not fullscreen without auto-entering", () => {
    const requestFullscreen = installFullscreenApi();

    render(<PresentationModeControl />);

    expect(
      screen.getByRole("button", { name: /Vollbild.*ملء الشاشة/i }),
    ).toBeInTheDocument();
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("requests fullscreen only after user activation", async () => {
    const user = userEvent.setup();
    const requestFullscreen = installFullscreenApi();

    render(<PresentationModeControl />);
    await user.click(screen.getByRole("button", { name: /Vollbild/i }));

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("uses native keyboard activation for Enter", async () => {
    const user = userEvent.setup();
    const requestFullscreen = installFullscreenApi();

    render(<PresentationModeControl />);
    const button = screen.getByRole("button", { name: /Vollbild/i });
    button.focus();
    await user.keyboard("{Enter}");

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("hides while fullscreen and returns after fullscreenchange exits", () => {
    installFullscreenApi();
    render(<PresentationModeControl />);

    fullscreenElement = document.documentElement;
    fireEvent(document, new Event("fullscreenchange"));
    expect(screen.queryByRole("button", { name: /Vollbild/i })).not.toBeInTheDocument();

    fullscreenElement = null;
    fireEvent(document, new Event("fullscreenchange"));
    expect(screen.getByRole("button", { name: /Vollbild/i })).toBeInTheDocument();
  });

  it("keeps the display usable and shows fallback guidance when fullscreen is denied", async () => {
    const user = userEvent.setup();
    installFullscreenApi(
      vi.fn<() => Promise<void>>().mockRejectedValue(
        new DOMException("Fullscreen denied", "NotAllowedError"),
      ),
    );

    render(<PresentationModeControl />);
    await user.click(screen.getByRole("button", { name: /Vollbild/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/Browser|متصفح/i);
    expect(screen.getByRole("button", { name: /Vollbild/i })).toBeInTheDocument();
  });

  it("shows a safe browser fallback when the Fullscreen API is unavailable", () => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });

    render(<PresentationModeControl />);

    expect(screen.queryByRole("button", { name: /Vollbild/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Browser|متصفح/i);
  });

  it("does not route fullscreen behavior by browser vendor or user agent", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/PresentationModeControl.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/navigator\.userAgent/i);
    expect(source).not.toMatch(/Samsung|Amazon|Silk/i);
  });
});
