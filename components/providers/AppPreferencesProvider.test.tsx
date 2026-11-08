import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppPreferencesProvider, useAppPreferences } from "./AppPreferencesProvider";

const mocks = vi.hoisted(() => ({
  getRegistration: vi.fn(),
  register: vi.fn(),
  getSubscription: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(async () => true),
  fetch: vi.fn(),
  requestPermission: vi.fn(async () => "granted"),
}));

vi.mock("@/lib/i18n/context", () => ({
  useLocale: () => ({ locale: "en" }),
}));
vi.mock("@/components/providers/AuthProvider", () => ({
  usePublicAuth: () => ({ session: null, loading: false }),
}));

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/example",
  toJSON: () => ({
    endpoint: "https://fcm.googleapis.com/fcm/send/example",
    keys: { auth: "auth", p256dh: "p256dh" },
  }),
  unsubscribe: mocks.unsubscribe,
};

function Controls() {
  const { pushStatus, disableNotifications, enableNotifications, busy } = useAppPreferences();
  return (
    <div>
      <span data-testid="push-status">{pushStatus}</span>
      <button disabled={busy} onClick={() => void disableNotifications()}>Disable</button>
      <button disabled={busy} onClick={() => void enableNotifications()}>Enable</button>
    </div>
  );
}

async function renderEnabled() {
  render(<AppPreferencesProvider><Controls /></AppPreferencesProvider>);
  await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled"));
}

describe("browser push disable / re-enable consistency", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.unsubscribe.mockResolvedValue(true);
    mocks.getSubscription.mockResolvedValue(subscription);
    mocks.subscribe.mockResolvedValue(subscription);
    const registration = {
      pushManager: {
        getSubscription: mocks.getSubscription,
        subscribe: mocks.subscribe,
      },
    };
    mocks.getRegistration.mockResolvedValue(registration);
    mocks.register.mockResolvedValue(registration);
    mocks.fetch.mockResolvedValue({ ok: true });
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AQ");
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubGlobal("PushManager", class PushManager {});
    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: mocks.requestPermission,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: mocks.getRegistration,
        register: mocks.register,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
  });

  it("does not unsubscribe the browser if the server refuses to disable the subscription", async () => {
    mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => (
      { ok: init?.method !== "DELETE", status: init?.method === "DELETE" ? 503 : 200 }
    ));
    const user = userEvent.setup();
    await renderEnabled();

    await user.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("error"));

    expect(mocks.fetch).toHaveBeenCalledWith("/api/push/subscriptions", expect.objectContaining({
      method: "DELETE",
    }));
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });

  it("does not unsubscribe when the server request fails due to a network error", async () => {
    mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") throw new Error("Network unavailable");
      return { ok: true };
    });
    const user = userEvent.setup();
    await renderEnabled();

    await user.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("error"));
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });

  it("unsubscribes and marks disabled only after the server accepts the change", async () => {
    const user = userEvent.setup();
    await renderEnabled();

    await user.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled"));

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    const request = mocks.fetch.mock.calls.find((call) => call[1]?.method === "DELETE");
    expect(request?.[0]).toBe("/api/push/subscriptions");
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      endpoint: subscription.endpoint,
      browserId: expect.any(String),
    });
  });

  it("can retry a failed remote disable without leaving an orphaned push registration", async () => {
    mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => (
      { ok: init?.method !== "DELETE" }
    ));
    const user = userEvent.setup();
    await renderEnabled();

    await user.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("error"));
    expect(mocks.unsubscribe).not.toHaveBeenCalled();

    mocks.fetch.mockResolvedValue({ ok: true });
    await user.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled"));
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("reports a failed browser unsubscribe instead of claiming notifications are disabled", async () => {
    mocks.unsubscribe.mockResolvedValue(false);
    const user = userEvent.setup();
    await renderEnabled();

    await user.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("error"));
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("can enable notifications again after a successful disable", async () => {
    const user = userEvent.setup();
    await renderEnabled();

    await user.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled"));

    mocks.getSubscription.mockResolvedValue(null);
    await user.click(screen.getByRole("button", { name: "Enable" }));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled"));
    expect(mocks.subscribe).toHaveBeenCalledOnce();
    expect(mocks.requestPermission).toHaveBeenCalledOnce();
    expect(mocks.fetch.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(2);
  });
});
