import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("prayer notification delivery audit", () => {
  it("keeps published QA schedules out of the real cron path", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");

    const snapshot = source("supabase/migrations/20260923030000_published_prayer_schedule_snapshot.sql");
    expect(cron).toContain("getPublishedPrayerScheduleSnapshot");
    expect(snapshot).toContain("p.published = true");
    expect(snapshot).toContain("'note', p.note");
    expect(snapshot).toContain("'note_ar', p.note_ar");
    expect(snapshot).toContain("'note_en', p.note_en");
    expect(snapshot).toContain("'note_de', p.note_de");
    expect(snapshot).toContain("'note_tr', p.note_tr");
    expect(cron).toContain("isPrayerScheduleQaRow");
    expect(cron).toContain(".filter((schedule) => !isPrayerScheduleQaRow(schedule))");
  });

  it("checks pre-Adhan and Adhan due windows every cron run", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");

    expect(cron).toContain("const supportedLeadMinutes = [5, 10, 15] as const");
    expect(cron).toContain("const adhanLookbackMs = 5 * 60 * 1000");
    expect(cron).toContain("const prePrayerLookbackMs = 2 * 60 * 1000");
    expect(cron).toContain("const prePrayerAt = adhanAt - leadMinutes * 60 * 1000");
    expect(cron).toContain("deliverPrayerReminderEvent");
  });

  it("delivers user-visible high-urgency prayer pushes with stable deduplication", () => {
    const delivery = source("lib/prayer-reminder-delivery.ts");
    const webPush = source("lib/push/web-push.ts");

    expect(delivery).toContain('notificationType: "prayer_reminder"');
    expect(delivery).toContain('kind: isAdhan ? "adhan" : "prayer-reminder"');
    expect(delivery).toContain("prayer,");
    expect(delivery).toContain("date,");
    expect(webPush).toContain("reserveDelivery");
    expect(webPush).toContain("TTL: isPrayerReminder ? 10 * 60 : 60 * 60 * 24");
    expect(webPush).toContain('urgency: notificationType === "urgent_announcement" || isPrayerReminder ? "high" : "normal"');
    expect(webPush).toContain('statusCode === "404" || statusCode === "410"');
  });

  it("keeps the browser subscription account-linked and the Service Worker notification/Adhan bridge intact", () => {
    const preferences = source("components/providers/AppPreferencesProvider.tsx");
    const subscriptionRoute = source("app/api/push/subscriptions/route.ts");
    const serviceWorker = source("public/sw.js");

    expect(preferences).toContain('headers.Authorization = `Bearer ${accessToken}`');
    expect(preferences).toContain('navigator.serviceWorker.register("/sw.js"');
    expect(subscriptionRoute).toContain("client.auth.getUser(token)");
    expect(subscriptionRoute).toContain("user_id: verifiedUserId");
    expect(serviceWorker).toContain('self.addEventListener("push"');
    expect(serviceWorker).toContain("self.registration.showNotification");
    expect(serviceWorker).toContain("broadcastAdhanToOpenApp(payload)");
    expect(serviceWorker).toContain('type: "ADHAN_DUE"');
  });
});
