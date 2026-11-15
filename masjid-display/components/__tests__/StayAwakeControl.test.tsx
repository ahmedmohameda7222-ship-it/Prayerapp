import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StayAwakeControl } from "../StayAwakeControl";

afterEach(cleanup);

describe("Stay Awake TV button", () => {
  it("renders alongside the presentation button and requests wake on remote/keyboard activation", async () => {
    const toggle = vi.fn();
    render(<StayAwakeControl requested={false} status="pending" onToggle={toggle} />);
    const button = screen.getByRole("button", { name: /Stay Awake/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.setup().click(button);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("displays real browser success and lets users disable the active request", async () => {
    const toggle = vi.fn();
    render(<StayAwakeControl requested status="active" onToggle={toggle} />);
    const button = screen.getByRole("button", { name: /Stay Awake/i });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(/active/i);
    await userEvent.setup().click(button);
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("never labels a denied or unsupported lock as working", () => {
    const noop = vi.fn();
    const { rerender } = render(<StayAwakeControl requested status="unsupported" onToggle={noop} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/unsupported|not supported/i);
    expect(screen.queryByText(/Wake Lock active/i)).not.toBeInTheDocument();

    rerender(<StayAwakeControl requested status="denied" onToggle={noop} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/blocked|denied/i);
    expect(screen.queryByText(/Wake Lock active/i)).not.toBeInTheDocument();
  });
});
