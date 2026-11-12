import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineStatusBanner } from "./OfflineStatusBanner";

vi.mock("@/lib/i18n/context", () => ({
  useLocale: () => ({ locale: "en" }),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("public offline status", () => {
  it("clearly labels saved data when connectivity disappears and hides on reconnect", () => {
    render(<OfflineStatusBanner />);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent(window, new Event("offline"));
    expect(screen.getByRole("status").textContent).toContain("Offline");
    expect(screen.getByRole("status").textContent).toContain("saved");
    fireEvent(window, new Event("online"));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
