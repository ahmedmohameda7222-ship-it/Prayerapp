import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android bridge readiness v2", () => {
  it("retries the native ready handshake until the web acknowledges it, then refreshes status", () => {
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const launcher = source("android-twa/app/src/main/java/de/donaumoschee/app/LauncherActivity.java");

    expect(protocol).toContain('"web.bridge.ready"');
    expect(bridge).toContain("READY_RETRY_INTERVAL_MS");
    expect(bridge).toContain("READY_HANDSHAKE_TIMEOUT_MS");
    expect(bridge).toContain("startReadyHandshake");
    expect(bridge).toContain("acknowledgeReady");
    expect(bridge).toContain("mainHandler.removeCallbacks");
    expect(bridge).toContain("sendStatus()");
    expect(launcher).toContain("bridgeHandler.startReadyHandshake()");
    expect(launcher).toContain("bridgeHandler.close()");
  });

  it("keeps web bridge availability probing until an explicit timeout or native ready event", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");

    expect(provider).toContain('type NativeBridgeState = "probing" | "ready" | "unavailable"');
    expect(provider).toContain("BRIDGE_READY_TIMEOUT_MS");
    expect(provider).toContain('useState<NativeBridgeState>("probing")');
    expect(provider).toContain('setBridgeState("unavailable")');
    expect(provider).toContain('setBridgeState("ready")');
    expect(provider).toContain('type: "web.bridge.ready"');

    const readyIndex = provider.indexOf('type: "web.bridge.ready"');
    const statusIndex = provider.indexOf('type: "native.status.request"', readyIndex);
    expect(readyIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeGreaterThan(readyIndex);
  });

  it("does not fall back to browser notification/test paths while native readiness is still probing", () => {
    const settings = source("components/settings/SettingsControls.tsx");
    const tests = source("components/settings/PrayerSystemTestControls.tsx");

    expect(settings).toContain("bridgeState");
    expect(settings).toContain('bridgeState === "probing"');
    expect(tests).toContain("bridgeState");
    expect(tests).toContain('bridgeState === "probing"');
  });
});
