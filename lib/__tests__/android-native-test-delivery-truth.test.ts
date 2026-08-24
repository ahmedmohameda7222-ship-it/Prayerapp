import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("native prayer self-test delivery truth", () => {
  it("waits for durable native delivery state instead of treating scheduling as success", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");

    expect(provider).toContain('message.type === "native.test.accepted"');
    expect(provider).toContain('send("native.test.status", { eventId: pending.eventId })');
    expect(provider).toContain('message.payload.state === "delivered"');
    expect(provider).toContain('message.payload.state === "failed"');
    expect(provider).not.toContain('pending.resolve(message.payload.success === true)');
  });

  it("gives the 10-second alarm enough time to reach an actual terminal delivery state", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");

    expect(provider).toContain("const NATIVE_TEST_RESULT_TIMEOUT_MS = 30_000");
    expect(provider).toContain("const NATIVE_TEST_STATUS_POLL_MS = 750");
  });

  it("updates self-test UI immediately from the terminal promise and never invents success on a timer", () => {
    const controls = source("components/settings/PrayerSystemTestControls.tsx");

    expect(controls).toContain("setAdhanStatus(delivered ? copy.adhanTriggered : copy.adhanFailed)");
    expect(controls).toContain("setReminderStatus(delivered ? copy.reminderSent : copy.reminderFailed)");
    expect(controls).not.toContain("window.setTimeout(() => {");
  });
});