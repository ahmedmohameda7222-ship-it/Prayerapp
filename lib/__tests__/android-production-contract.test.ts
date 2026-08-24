import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android production contract", () => {
  it("uses the permanent Android package and signing certificate in source-owned production metadata", () => {
    const manifest = source("android-twa/app/src/main/AndroidManifest.xml");
    const gradle = source("android-twa/app/build.gradle");
    const assetLinks = source("public/.well-known/assetlinks.json");
    const twaManifest = source("android-twa/twa-manifest.json");
    expect(manifest).toContain("de.donaumoschee.app");
    expect(gradle).toContain('applicationId "de.donaumoschee.app"');
    expect(assetLinks).toContain("de.donaumoschee.app");
    expect(assetLinks).toContain("E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92");
    expect(twaManifest).toContain("de.donaumoschee.app");
  });

  it("keeps prayer schedules mosque-owned and avoids a fabricated production fallback", () => {
    const schedule = source("app/api/android/prayer-schedule/route.ts");
    expect(schedule).toContain("prayer_times");
    expect(schedule).toContain("published");
    expect(schedule).toContain("isPrayerScheduleQaRow");
    expect(schedule).not.toContain("AlAdhan");
    expect(schedule).not.toContain("MuslimSalat");
  });

  it("shares canonical prayer event identity between web delivery and the native Android engine", () => {
    const ts = source("lib/android/prayer-event-id.ts");
    const java = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerEventId.java");
    expect(ts).toContain('return `p2:${encode(parts.join("|"))}`');
    expect(java).toContain('return "p2:" + encode(parts);');
  });

  it("keeps the native credential out of native status and web JavaScript", () => {
    const status = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/NativeStatus.java");
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const nativeWeb = source("lib/android/native-web.ts");
    expect(status).not.toContain('.put("credential"');
    expect(provider).not.toContain("status.credential");
    expect(provider).not.toContain("Authorization: `Native");
    expect(nativeWeb).not.toContain("credential?:");
  });

  it("uses real native receipts as the server fallback proof and fails open when proof is unavailable", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    const push = source("lib/push/targeting.ts");
    expect(cron).toContain("native_prayer_delivery_receipts");
    expect(cron).toContain("account_generation");
    expect(cron).toContain("native authority lookup failed open");
    expect(cron).toContain("native receipt lookup failed open");
    expect(cron).not.toContain("const targets = filterPrayerPushTargets(pushTargets, nativeLeases, now)");
    expect(push).not.toContain("native_prayer_installations");
  });

  it("revokes native authority on refresh failure and leaves concise adb diagnostics", () => {
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");
    const scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
    const playback = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java");
    expect(worker).toContain('syncSucceeded && status.getBoolean("scheduleFresh")');
    expect(`${worker}\n${scheduler}\n${playback}`).toContain('TAG = "DanubePrayer"');
  });

  it("clears native account state and alarms before another signed-in account can take ownership", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
    const enroll = source("app/api/android/native-authority/enroll/route.ts");

    expect(provider).not.toContain('method: "DELETE"');
    expect(provider).toContain('send("native.account.reset"');
    expect(protocol).toContain('"native.account.reset"');
    expect(bridge).toContain('case "native.account.reset"');
    expect(bridge).toContain("PrayerScheduler.cancelAll(context)");
    expect(bridge).toContain("store.resetAccountStateAndQueueAuthorityRevocation()");
    expect(bridge).toContain("NativeWork.flushAuthorityRevocation(context)");
    expect(scheduler).toContain("public static void cancelAll");
    expect(store).toContain("public int resetAccountStateAndQueueAuthorityRevocation()");
    expect(enroll).toContain('select("user_id, credential_hash, authority_id, revoked_at, account_generation")');
    expect(enroll).toContain("credentialMatches(credential");
  });

  it("does not start native Adhan playback when Android notification delivery or the Adhan channel is disabled", () => {
    const receiver = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");
    const capabilities = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/NotificationCapabilities.java");
    expect(capabilities).toContain("adhanDeliveryReady()");
    expect(receiver).toContain("notificationCapabilities(context).adhanDeliveryReady()");
    expect(receiver).not.toContain("!NativeStatus.hasNotificationPermission(context)");
  });

  it("makes native account transitions race-safe across auth hydration, legacy upgrades, web sync, and refresh workers", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    expect(provider).toContain("authLoading");
    expect(provider).toContain("accountTransitioningRef");
    expect(provider).toContain("syncGenerationRef");
    expect(provider).toContain("NATIVE_CONFIG_CHANGED_EVENT");
    expect(worker).toContain("store.accountGeneration() != generation");
    expect(store).toContain("saveConfigIfGeneration");
    expect(store).toContain("bindAuthorityIdIfGeneration");
  });
});
