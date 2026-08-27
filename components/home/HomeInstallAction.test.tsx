import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANDROID_PUBLIC_DOWNLOAD_PATH } from "@/lib/android-release";
import { HomeInstallAction } from "./HomeInstallAction";

const nativeState = vi.hoisted(() => ({ isNative: false }));

vi.mock("@/components/providers/NativeAndroidProvider", () => ({
  useNativeAndroid: () => ({ isNative: nativeState.isNative }),
}));

vi.mock("@/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function setUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  nativeState.isNative = false;
  setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151 Safari/537.36");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  window.__pwaInstallPrompt = undefined;
});

describe("HomeInstallAction", () => {
  it("uses the public APK directly for a non-native Android browser", async () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/151 Mobile Safari/537.36");

    render(<HomeInstallAction />);

    const action = await screen.findByRole("link", { name: "settings.installApp" });
    expect(action).toHaveAttribute("href", ANDROID_PUBLIC_DOWNLOAD_PATH);
    expect(action).not.toHaveAttribute("href", "/settings#install-app");
    expect(action).toHaveClass("h-11", "w-11");
  });

  it("stays hidden inside the native Android app", async () => {
    nativeState.isNative = true;
    setUserAgent("Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/151 Mobile Safari/537.36");

    render(<HomeInstallAction />);

    await waitFor(() => {
      expect(screen.queryByLabelText("settings.installApp")).not.toBeInTheDocument();
    });
  });

  it("preserves the PWA install prompt on iOS and other non-Android browsers", async () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1");
    const prompt = vi.fn().mockResolvedValue(undefined);
    window.__pwaInstallPrompt = {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    } as BeforeInstallPromptEvent;

    render(<HomeInstallAction />);

    const action = await screen.findByRole("button", { name: "settings.installApp" });
    expect(action).toHaveClass("h-11", "w-11");
    expect(screen.queryByRole("link", { name: "settings.installApp" })).not.toBeInTheDocument();

    fireEvent.click(action);
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  });
});
