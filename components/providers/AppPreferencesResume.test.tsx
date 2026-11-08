import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppPreferencesProvider, useAppPreferences } from "./AppPreferencesProvider";

const mocks = vi.hoisted(() => ({
  getRegistration: vi.fn(),
  getSubscription: vi.fn(),
  fetch: vi.fn(),
  requestPermission: vi.fn(),
}));

const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState");
const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

vi.mock("@/lib/i18n/context", () => ({
  useLocale: () => ({ locale: "en" }),
}));
vi.mock("@/components/providers/AuthProvider", () => ({
  usePublicAuth: () => ({ session: null, loading: false }),
}));

const subscription = {
  endpoint: "https://push.example.test/subscription",
  toJSON: () => ({ endpoint: "https://push.example.test/subscription", keys: { auth: "test", p256dh: "test" } }),
};

function Status() {
  const { pushStatus, permission, disableNotifications } = useAppPreferences();
  return <>
    <output data-testid="push-status">{pushStatus}:{permission}</output>
    <button type="button" onClick={() => void disableNotifications()}>Disable</button>
  </>;
}

function renderStatus() {
  return render(<AppPreferencesProvider><Status /></AppPreferencesProvider>);
}

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
}

function restoreProperty(target: object, name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(target, name, descriptor);
  else Reflect.deleteProperty(target, name);
}

describe("PWA Push state after returning from background or iOS Home Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AQ");
    vi.stubGlobal("PushManager", class PushManager {});
    vi.stubGlobal("Notification", { permission: "granted", requestPermission: mocks.requestPermission });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockResolvedValue({ ok: true });
    mocks.getSubscription.mockResolvedValue(subscription);
    mocks.getRegistration.mockResolvedValue({ pushManager: { getSubscription: mocks.getSubscription } });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: mocks.getRegistration },
    });
    setVisibility("visible");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    restoreProperty(document, "visibilityState", originalVisibilityState);
    restoreProperty(navigator, "serviceWorker", originalServiceWorker);
  });

  it("reflects permission revoked in OS settings after the app becomes visible", async () => {
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted"));
    mocks.fetch.mockClear();
    (Notification as unknown as { permission: string }).permission = "denied";

    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("denied:denied"));
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.requestPermission).not.toHaveBeenCalled();
  });

  it("does not keep showing enabled when permission returns to default on foreground", async () => {
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted"));
    mocks.fetch.mockClear();
    (Notification as unknown as { permission: string }).permission = "default";

    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled:default"));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("detects a browser-removed Push subscription when restored from BFCache", async () => {
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted"));
    mocks.fetch.mockClear();
    mocks.getSubscription.mockResolvedValue(null);

    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled:granted"));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("recovers from external permission grant without requesting permission again", async () => {
    (Notification as unknown as { permission: string }).permission = "denied";
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("denied:denied"));
    (Notification as unknown as { permission: string }).permission = "granted";

    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted"));
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledWith("/api/push/subscriptions", expect.objectContaining({ method: "POST" }));
  });

  it("waits for an in-flight resume POST before server disable, keeping notifications disabled", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    mocks.getSubscription.mockResolvedValue({ ...subscription, unsubscribe });
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted"));

    mocks.fetch.mockClear();
    let resolveSync!: (result: { ok: boolean }) => void;
    const pendingSync = new Promise<{ ok: boolean }>((resolve) => { resolveSync = resolve; });
    mocks.fetch.mockImplementation((_url, init) => (
      init?.method === "POST" ? pendingSync : Promise.resolve({ ok: true })
    ));

    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/push/subscriptions", expect.objectContaining({ method: "POST" }),
    ));
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // A pending POST must finish before DELETE or it can re-enable the server's subscription.
    expect(mocks.fetch.mock.calls.map(([, init]) => init?.method)).toEqual(["POST"]);
    await act(async () => { resolveSync({ ok: true }); await pendingSync; });

    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled:granted"));
    expect(mocks.fetch.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "DELETE"]);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not start a background subscription sync during a manual disable", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    mocks.getSubscription.mockResolvedValue({ ...subscription, unsubscribe });
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted"));

    mocks.fetch.mockClear();
    let resolveDelete!: (result: { ok: boolean }) => void;
    const pendingDelete = new Promise<{ ok: boolean }>((resolve) => { resolveDelete = resolve; });
    mocks.fetch.mockImplementation((_url, init) => (
      init?.method === "DELETE" ? pendingDelete : Promise.resolve({ ok: true })
    ));
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/push/subscriptions", expect.objectContaining({ method: "DELETE" }),
    ));
    document.dispatchEvent(new Event("visibilitychange"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(mocks.fetch.mock.calls.map(([, init]) => init?.method)).toEqual(["DELETE"]);

    await act(async () => { resolveDelete({ ok: true }); await pendingDelete; });
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("disabled:granted"));
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not refresh permission while hidden until the app becomes visible", async () => {
    renderStatus();
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted"));
    setVisibility("hidden");
    (Notification as unknown as { permission: string }).permission = "denied";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(screen.getByTestId("push-status")).toHaveTextContent("enabled:granted");

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(screen.getByTestId("push-status")).toHaveTextContent("denied:denied"));
  });
});
