import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SettingsControls } from "./SettingsControls";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";

describe("SettingsControls", () => {
  beforeEach(() => localStorage.clear());

  it("applies and persists dark mode", async () => {
    const user = userEvent.setup();
    render(<AppPreferencesProvider><TimeFormatProvider><SettingsControls /></TimeFormatProvider></AppPreferencesProvider>);
    const dark = screen.getByRole("button", { name: "داكن" });
    await user.click(dark);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("deggendorf-app-preferences-v1")).toContain('"theme":"dark"');
  });
});
