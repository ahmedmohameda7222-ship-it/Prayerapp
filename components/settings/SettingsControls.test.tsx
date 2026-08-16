import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SettingsControls } from "./SettingsControls";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { AdhanAudioProvider } from "@/components/providers/AdhanAudioProvider";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";

function renderSettings() {
  return render(
    <AppPreferencesProvider>
      <AdhanAudioProvider>
        <TimeFormatProvider>
          <SettingsControls />
        </TimeFormatProvider>
      </AdhanAudioProvider>
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

  it("retires global prayer reminder timing and points reminder management to Home", () => {
    renderSettings();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    const homeLink = screen.getAllByRole("link").find((link) => link.getAttribute("href") === "/#prayer-times");
    expect(homeLink).toBeDefined();
  });

  it("offers device-only sound plus two in-app Adhan choices", () => {
    renderSettings();

    expect(screen.getByTestId("adhan-audio-settings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Device notification sound only/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adhan 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adhan 2/i })).toBeInTheDocument();
  });
});
