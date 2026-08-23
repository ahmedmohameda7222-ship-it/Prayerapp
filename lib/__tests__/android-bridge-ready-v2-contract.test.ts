import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android bridge readiness v2", () => {
  it("captures the first port-bearing native message before React providers mount", () => {
    const bootstrap = source("components/providers/PlatformChromeBootstrap.tsx");
    const layout = source("app/layout.tsx");

    expect(bootstrap).toContain("__DANUBE_NATIVE_BRIDGE_BOOTSTRAP__");
    expect(bootstrap).toContain('event.origin !== "https://donaumoschee.vercel.app"');
    expect(bootstrap).toContain("event.ports[0]");
    expect(bootstrap).toContain('initial.type !== "native.ready"');
    expect(bootstrap).toContain('window.addEventListener("message", captureNativeBridge)');

    const bootstrapIndex = layout.indexOf("<PlatformChromeBootstrap />");
    const providerIndex = layout.indexOf("<NativeAndroidProvider>");
    expect(bootstrapIndex).toBeGreaterThan(-1);
    expect(providerIndex).toBeGreaterThan(bootstrapIndex);
  });

  it("acknowledges native readiness, explicitly refreshes status, and times out deterministically", () => {
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const provider = source("components/providers/NativeAndroidProvider.tsx");

    expect(protocol).toContain('"web.bridge.ready"');
    expect(bridge).toContain('case "web.bridge.ready": sendStatus(); break;');
    expect(provider).toContain('type NativeBridgeState = "probing" | "ready" | "unavailable"');
    expect(provider).toContain("BRIDGE_READY_TIMEOUT_MS");
    expect(provider).toContain('useState<NativeBridgeState>("probing")');
    expect(provider).toContain("__DANUBE_NATIVE_BRIDGE_BOOTSTRAP__");
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
