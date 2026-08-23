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

  it("simulates real Adhan-now and 15-minute reminder events after ten seconds", () => {
    const controls = source("components/settings/PrayerSystemTestControls.tsx");
    const preferences = source("components/providers/AppPreferencesProvider.tsx");
    const route = source("app/api/push/test/route.ts");
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    const delivery = source("lib/prayer-reminder-delivery.ts");

    expect(controls).toContain("const TEST_SECONDS = 10");
    expect(controls).toContain("const TEST_REMINDER_MINUTES = 15");
    expect(controls).toContain("copy.testAdhan");
    expect(controls).toContain("copy.testReminder");
    expect(controls).toContain("primeSound(soundId)");
    expect(controls).toContain("sendTestAdhan(prayer, TEST_SECONDS)");
    expect(controls).toContain("sendTestPrayerReminder(prayer, TEST_SECONDS)");

    expect(preferences).toContain('sendPrayerSimulation("adhan", prayer, delaySeconds)');
    expect(preferences).toContain('sendPrayerSimulation("reminder", prayer, delaySeconds)');

    expect(route).toContain("const TEST_DELAY_MS = 10_000");
    expect(route).toContain("const TEST_REMINDER_LEAD_MINUTES = 15 as const");
    expect(route).toContain("deliverPrayerReminderEvent");
    expect(route).toContain('value === "reminder" || value === "adhan"');
    expect(route).toContain("eventId,");
    expect(route).toContain("dueAt,");
    expect(route).toContain("expiresAt,");
    expect(route).not.toContain("eventKey,");
    expect(route).not.toContain("notificationCopy");
    expect(route).not.toContain("adhanCopy");
    expect(route).not.toContain('kind: "content"');

    expect(cron).toContain("deliverPrayerReminderEvent");
    expect(delivery).toContain("deliverPushNotifications");
    expect(delivery).toContain('kind: isAdhan ? "adhan" : "prayer-reminder"');
    expect(delivery).toContain("adhanReminderBody(locale, prayer)");
    expect(delivery).toContain("beforeReminderBody(locale, prayer, leadMinutes)");
    expect(delivery).toContain('ar: `تبقّى ${minutes} دقيقة على أذان ${name}.`');
  });
});
