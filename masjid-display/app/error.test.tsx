import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DisplayError from "./error";

describe("display error boundary", () => {
  it("shows a safe recovery shell without exposing the thrown error", () => {
    const reset = vi.fn();
    render(
      <DisplayError
        error={new Error("internal-secret-stack-detail")}
        reset={reset}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/Display.*unavailable/i);
    expect(screen.queryByText(/internal-secret-stack-detail/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
