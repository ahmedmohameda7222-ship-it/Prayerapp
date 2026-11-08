import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppPreferencesProvider, useAppPreferences } from "./AppPreferencesProvider";

const mocks = vi.hoisted(() => ({
  getRegistration: vi.fn(),
  getSubscription: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/i18n/context", () => ({
  useLocale: () => ({ locale: "en" }),
}));
vi.mock("@/components/providers/AuthProvider", () => ({
  usePublicAuth: () => ({ session: null, loading: false }),
}));

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/bootstrap-test",
  toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/bootstrap-test", keys: { auth: "test", p256dh: "test" } }),
};

function Status() {
  const { pushStatus } = useAppPreferences();
  return <output data-testid="push-status">{pushStatus}</output>;
}

function renderStatus() {
  return render(<AppPreferencesProvider><Status /></AppPreferencesProvider>);
}

describe("PWA push bootstrap after browser permission / Service Worker failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AQ");
    vi.stubGlobal("PushManager", class PushManager {});
    vi.stubGlobal("Notification", { permission: "granted" });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockResolvedValue({ ok: true });
    mocks.getSubscription.mockResolvedValue(subscription);
    mocks.getRegistration.mockResolvedValue({ pushManager: { getSubscription: mocks.getSubscription } });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: mocks.getRegistration },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
  });

  it("surfaces a Service Worker registration lookup failure instead of hanging in checking", async () => {
    mocks.getRegistration.mockRejectedValueOnce(new Error("Registration unavailable"));
    renderStatus();

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("error"));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("surfaces a PushManager lookup failure instead of hanging in checking", async () => {
    mocks.getSubscription.mockRejectedValueOnce(new Error("Push storage unavailable"));
    renderStatus();

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("error"));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not report enabled or sync a stale subscription if notification permission was revoked", async () => {
    vi.stubGlobal("Notification", { permission: "default" });
    renderStatus();

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled"));
    expect(mocks.getRegistration).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("keeps a granted existing subscription linked on a healthy bootstrap", async () => {
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled"));
    expect(mocks.getSubscription).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledWith("/api/push/subscriptions", expect.objectContaining({ method: "POST" }));
  });
});
