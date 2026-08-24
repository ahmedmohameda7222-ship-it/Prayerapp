import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(path, "utf8");

describe("Android permission settings routing", () => {
  it("exposes one typed settings action from the native provider", () => {
    const provider = readSource("components/providers/NativeAndroidProvider.tsx");

    expect(provider).toContain("openNativeSettings: (target: NativePermissionDiagnosticKey) => void");
    expect(provider).toContain('send("native.settings.open", { target })');
    expect(provider).toContain("openNativeSettings,");
  });

  it("routes each failing diagnostic row instead of using the generic permission button", () => {
    const settings = readSource("components/settings/SettingsControls.tsx");

    expect(settings).toContain("openNativeSettings(diagnostic.key)");
    expect(settings).toContain("diagnostic.ok ? null");
    expect(settings).not.toContain("onClick={requestPermissions}");
  });

  it("accepts the precise native settings bridge command", () => {
    const bridge = readSource("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");

    expect(bridge).toContain('case "native.settings.open": openSettings(envelope.payload); break;');
    expect(bridge).toContain("NativeSettingsLauncher.open(context, target)");
  });
});