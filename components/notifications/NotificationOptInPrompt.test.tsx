import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/context";
import { NotificationOptInPrompt } from "./NotificationOptInPrompt";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  preferences: {
    pushStatus: "disabled",
    permission: "default",
    busy: false,
    enableNotifications: vi.fn(async () => undefined),
  },
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/components/providers/AppPreferencesProvider", () => ({
  useAppPreferences: () => mocks.preferences,
}));

const STORAGE_KEY = "masjid-el-rahman-notification-opt-in-v1";

function renderPrompt() {
  return render(
    <I18nProvider initialLocale="en">
      <NotificationOptInPrompt />
    </I18nProvider>
  );
}

describe("NotificationOptInPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.pathname = "/";
    mocks.preferences.pushStatus = "disabled";
    mocks.preferences.permission = "default";
    mocks.preferences.busy = false;
    mocks.preferences.enableNotifications.mockClear();
  });

  it("shows automatically but only enables notifications after a user click", async () => {
    const user = userEvent.setup();
    const view = renderPrompt();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mocks.preferences.enableNotifications).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Enable notifications" }));
    expect(mocks.preferences.enableNotifications).toHaveBeenCalledOnce();

    mocks.preferences.pushStatus = "enabled";
    view.rerender(
      <I18nProvider initialLocale="en">
        <NotificationOptInPrompt />
      </I18nProvider>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("snoozes the prompt for three days when Later is selected", async () => {
    const user = userEvent.setup();
    const view = renderPrompt();

    await user.click(await screen.findByRole("button", { name: "Later" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as { dismissedUntil?: string };
    const remaining = Date.parse(stored.dismissedUntil || "") - Date.now();
    expect(remaining).toBeGreaterThan(2.9 * 24 * 60 * 60 * 1000);

    view.unmount();
    renderPrompt();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows installation guidance on iOS without an enable action", async () => {
    const user = userEvent.setup();
    mocks.preferences.pushStatus = "ios-install-required";
    renderPrompt();

    expect(await screen.findByText("Install the app first")).toBeInTheDocument();
    expect(screen.getByText("Safari → Share → Add to Home Screen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enable notifications" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(mocks.preferences.enableNotifications).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never appears on admin routes", async () => {
    mocks.pathname = "/admin/events";
    renderPrompt();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it.each(["checking", "enabled", "unsupported", "unconfigured", "denied"])(
    "stays hidden when push status is %s",
    async (pushStatus) => {
      mocks.preferences.pushStatus = pushStatus;
      renderPrompt();

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    }
  );

  it("stays hidden when browser permission is denied", async () => {
    mocks.preferences.permission = "denied";
    renderPrompt();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
