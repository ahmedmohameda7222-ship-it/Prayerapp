import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("prayer system self-test contract", () => {
  it("reuses and preloads Adhan audio instead of recreating one player for every sound", () => {
    const provider = source("components/providers/AdhanAudioProvider.tsx");

    expect(provider).toContain("private audios = new Map<string, HTMLAudioElement>()");
    expect(provider).toContain('audio.preload = "auto"');
    expect(provider).toContain("controller.prepare");
    expect(provider).toContain("primeSound");
    expect(provider).not.toContain('document.visibilityState !== "visible"');
  });

  it("provides separate ten-second Adhan and real Web Push tests", () => {
    const controls = source("components/settings/PrayerSystemTestControls.tsx");
    const route = source("app/api/push/test/route.ts");

    expect(controls).toContain("const TEST_SECONDS = 10");
    expect(controls).toContain("copy.testAdhan");
    expect(controls).toContain("copy.testPush");
    expect(controls).toContain("primeSound(soundId)");
    expect(controls).toContain("sendTestNotification(TEST_SECONDS)");

    expect(route).toContain("const TEST_DELAY_MS = 10_000");
    expect(route).toContain("deliverPushNotifications");
    expect(route).toContain('.eq("endpoint", endpoint)');
    expect(route).toContain('.eq("browser_id", browserId)');
    expect(route).toContain('kind: "content"');
  });
});
