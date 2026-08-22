import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android native reset ordering", () => {
  it("invalidates the account generation before cancelling alarms but preserves alarm metadata until cancellation", () => {
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const reset = bridge.indexOf("store.resetAccountState()");
    const cancel = bridge.indexOf("PrayerScheduler.cancelAll(context)", reset);
    const clear = bridge.indexOf("store.clearAccountState()", cancel);
    expect(reset).toBeGreaterThanOrEqual(0);
    expect(cancel).toBeGreaterThan(reset);
    expect(clear).toBeGreaterThan(cancel);

    const resetMethod = store.slice(store.indexOf("public int resetAccountState()"), store.indexOf("public void clearAccountState()"));
    expect(resetMethod).not.toContain("remove(SCHEDULED_REQUEST_CODES)");
  });
});
