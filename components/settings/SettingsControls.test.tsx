import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsControls } from "./SettingsControls";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";

vi.mock("./PrayerSystemTestControls", () => ({
  PrayerSystemTestControls: () => <div data-testid="prayer-system-test" />,
}));

function renderSettings() {
  return render(
    <AppPreferencesProvider>
      <TimeFormatProvider>
        <SettingsControls />
      </TimeFormatProvider>
    </AppPreferencesProvider>,
  );
}

describe("SettingsControls", () => {
  beforeEach(() => localStorage.clear());

  it("removes legacy dark mode and keeps light mode", () => {
    localStorage.setItem("deggendorf-app-preferences-v1", JSON.stringify({ theme: "dark" }));
    document.documentElement.dataset.theme = "dark";

    renderSettings();

    expect(screen.queryByText(/dark/i)).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("deggendorf-app-preferences-v1")).not.toContain('"theme"');
  });

  it("keeps prayer reminder and Adhan management on Home while exposing test tools in Settings", () => {
    renderSettings();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByTestId("adhan-audio-settings")).not.toBeInTheDocument();
    expect(screen.getByTestId("prayer-system-test")).toBeInTheDocument();
    const homeLink = screen.getAllByRole("link").find((link) => link.getAttribute("href") === "/#prayer-times");
    expect(homeLink).toBeDefined();
  });
});
