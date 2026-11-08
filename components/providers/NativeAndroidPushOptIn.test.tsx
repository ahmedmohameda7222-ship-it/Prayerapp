import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NativeAndroidProvider, useNativeAndroid } from "./NativeAndroidProvider";

const mocks = vi.hoisted(() => ({
  pushStatus: "disabled" as "disabled" | "error" | "denied",
  permission: "granted" as "granted" | "denied" | "default",
  enableNotifications: vi.fn(async () => true),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  usePublicAuth: () => ({ session: null, loading: false }),
}));
vi.mock("@/components/providers/AppPreferencesProvider", () => ({
  useAppPreferences: () => ({
    pushStatus: mocks.pushStatus,
    permission: mocks.permission,
    enableNotifications: mocks.enableNotifications,
  }),
}));
vi.mock("@/lib/i18n/context", () => ({
  useLocale: () => ({ locale: "en" }),
}));

function Probe() {
  const { bridgeState, isNative } = useNativeAndroid();
  return <output data-testid="bridge-state">{bridgeState}:{isNative ? "native" : "web"}</output>;
}

function nativeStatusMessage(notificationPermission = true) {
  return JSON.stringify({
    version: 1,
    type: "native.ready",
    payload: {
      native: true,
      packageId: "de.donaumoschee.app",
      installationId: "00000000-0000-4000-8000-000000000001",
      accountGeneration: 0,
      notificationPermission,
      nativeReady: false,
      scheduleFresh: false,
      alarmScheduleInstalled: false,
      engineHealthy: false,
      audioReady: false,
      lastError: "",
      authorityId: "",
    },
  });
}

async function renderWithNativeBridge() {
  const port = { onmessage: null, start: vi.fn(), postMessage: vi.fn(), close: vi.fn() };
  Object.defineProperty(window, "__DANUBE_NATIVE_BRIDGE_BOOTSTRAP__", {
    configurable: true,
    writable: true,
    value: {
      origin: "https://donaumoschee.vercel.app",
      data: nativeStatusMessage(),
      port,
    },
  });

  const result = render(
    <NativeAndroidProvider>
      <Probe />
    </NativeAndroidProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("bridge-state")).toHaveTextContent("ready:native"));
  return result;
}

describe("Android Native fallback Web Push opt-in", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.pushStatus = "disabled";
    mocks.permission = "granted";
    mocks.enableNotifications = vi.fn(async () => true);
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "__DANUBE_NATIVE_BRIDGE_BOOTSTRAP__");
  });

  it("never re-requests Web Push when the browser has denied notification permission", async () => {
    mocks.pushStatus = "denied";
    mocks.permission = "denied";
    await renderWithNativeBridge();

    expect(mocks.enableNotifications).not.toHaveBeenCalled();
  });

  it("does not retry a failed Web Push setup automatically without user action", async () => {
    mocks.pushStatus = "error";
    mocks.permission = "granted";
    await renderWithNativeBridge();

    expect(mocks.enableNotifications).not.toHaveBeenCalled();
  });

  it("does not request browser permission automatically when it is still undecided", async () => {
    mocks.pushStatus = "disabled";
    mocks.permission = "default";
    await renderWithNativeBridge();

    expect(mocks.enableNotifications).not.toHaveBeenCalled();
  });

  it("auto-restores a previously granted fallback only once if React recreates its callback", async () => {
    const view = await renderWithNativeBridge();
    await waitFor(() => expect(mocks.enableNotifications).toHaveBeenCalledOnce());

    const nextEnable = vi.fn(async () => true);
    mocks.enableNotifications = nextEnable;
    view.rerender(
      <NativeAndroidProvider>
        <Probe />
      </NativeAndroidProvider>,
    );
    expect(nextEnable).not.toHaveBeenCalled();
  });
});
