import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android production completion contract", () => {
  it("uses the verified AndroidX Browser postMessage channel without a WebView JS interface", () => {
    const launcher = source("android-twa/app/src/main/java/de/donaumoschee/app/LauncherActivity.java");
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    expect(launcher).toContain("validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN");
    expect(launcher).toContain("requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle())");
    expect(launcher).toContain("relationshipValidated && bridgeHandler");
    expect(protocol).toContain("MAX_MESSAGE_LENGTH = 65_536");
    expect(`${launcher}\n${protocol}`).not.toContain("addJavascriptInterface");
  });

  it("routes real and ten-second test events through AlarmManager and the native receiver/service", () => {
    const scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
    const receiver = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");
    const service = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java");
    const controls = source("components/settings/PrayerSystemTestControls.tsx");
    expect(scheduler).toContain("setExactAndAllowWhileIdle");
    expect(scheduler).toContain("scheduleTest");
    expect(receiver).toContain("AdhanPlaybackService.class");
    expect(service).toContain("extends MediaSessionService");
    expect(service).toContain("setWakeMode(C.WAKE_MODE_LOCAL)");
    expect(service).toContain("CommandButton.ICON_STOP");
    expect(service).toContain('setChannelId("adhan-playback-v1")');
    expect(controls).toContain('scheduleTest("adhan"');
    expect(controls).toContain('scheduleTest("reminder"');
  });

  it("keeps the verified Madinah Fajr audio source identical in web and native catalogs", () => {
    const webCatalog = source("lib/adhan-audio.ts");
    const nativeCatalog = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanCatalog.java");
    expect(webCatalog).toContain('audioUrl: "https://www.ashefaa.com/ruqia/Azan/20.mp3"');
    expect(nativeCatalog).toContain('Map.entry("fajr-madinah", "https://www.ashefaa.com/ruqia/Azan/20.mp3")');
    expect(`${webCatalog}\n${nativeCatalog}`).not.toContain("/Azan/19.mp3");
  });

  it("keeps native authority short-lived, service-role-only, and prayer-push-specific", () => {
    const migration = source("supabase/migrations/20260821220800_android_native_authority.sql");
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    const push = source("lib/push/web-push.ts");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.native_prayer_installations from public, anon, authenticated");
    expect(migration).toContain("lease_expires_at");
    expect(cron).toContain("filterPrayerPushTargets");
    expect(cron).toContain("native authority lookup failed open");
    expect(push).not.toContain("native_prayer_installations");
  });

  it("revokes native authority on refresh failure and leaves concise adb diagnostics", () => {
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");
    const scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
    const playback = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java");
    expect(worker).toContain('syncSucceeded && status.getBoolean("scheduleFresh")');
    expect(`${worker}\n${scheduler}\n${playback}`).toContain('TAG = "DanubePrayer"');
  });
});
