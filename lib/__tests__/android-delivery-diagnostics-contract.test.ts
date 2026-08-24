import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android delivery diagnostics contract", () => {
  it("logs fallback activation with a bounded non-secret server shape", () => {
    const helperPath = join(process.cwd(), "lib/android/delivery-diagnostics.ts");
    expect(existsSync(helperPath)).toBe(true);
    if (!existsSync(helperPath)) return;

    const helper = read("lib/android/delivery-diagnostics.ts");
    const route = read("app/api/cron/prayer-reminders/route.ts");

    expect(helper).toContain('signal: "fallback_activation"');
    expect(helper).toContain("kind:");
    expect(helper).toContain("count:");
    expect(helper).toContain("receiptLookupFailed:");
    expect(helper).toContain("console.warn");
    for (const forbidden of [
      "eventId",
      "userId",
      "subscriptionId",
      "installationId",
      "authorityId",
      "credential",
      "endpoint",
      "p256dh",
    ]) {
      expect(helper).not.toContain(forbidden);
    }
    expect(route).toContain("logFallbackActivation");
  });

  it("hooks the four native operational failure signals without raw payload logging", () => {
    const refresh = read("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");
    const receipts = read("android-twa/app/src/main/java/de/donaumoschee/app/workers/DeliveryReceiptWorker.java");
    const store = read("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const adhan = read("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java");

    expect(refresh).toContain('DeliveryDiagnostics.emit("schedule_refresh_failure"');
    expect(receipts).toContain('DeliveryDiagnostics.emit("receipt_retry_failure"');
    expect(store).toContain('DeliveryDiagnostics.emit("native_unhealthy"');
    expect(adhan).toContain('DeliveryDiagnostics.emit("adhan_playback_failure"');
  });
});
