import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
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

  it("removes simulation controls while keeping notifications, reminder management, and time format", () => {
    renderSettings();
    const controls = source("components/settings/SettingsControls.tsx");

    expect(screen.queryByTestId("prayer-system-test")).not.toBeInTheDocument();
    expect(controls).not.toContain("PrayerSystemTestControls");
    expect(controls).toContain('t("settings.notifications")');
    expect(controls).toContain('href="/#prayer-times"');
    expect(controls).toContain('t("phase1.manageReminders")');
    expect(controls).toContain('t("settings.timeFormat")');
    expect(controls).toContain("timeFormatOptions.map");

    const homeLink = screen.getAllByRole("link").find((link) => link.getAttribute("href") === "/#prayer-times");
    expect(homeLink).toBeDefined();
  });
});
