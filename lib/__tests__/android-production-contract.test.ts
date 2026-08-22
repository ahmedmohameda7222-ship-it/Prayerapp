import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADHAN_SOUNDS } from "@/lib/adhan-audio";

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
    expect(service).toContain('CHANNEL = "adhan-playback-v1"');
    expect(service).toContain("setChannelId(CHANNEL)");
    expect(controls).toContain('scheduleTest("adhan"');
    expect(controls).toContain('scheduleTest("reminder"');
  });

  it("handles exact-alarm settings return through Activity Result without consuming initial resume", () => {
    const activity = source("android-twa/app/src/main/java/de/donaumoschee/app/NativePermissionActivity.java");
    const gradle = source("android-twa/app/build.gradle");
    expect(activity).toContain("extends ComponentActivity");
    expect(activity).toContain("registerForActivityResult");
    expect(activity).toContain("ActivityResultContracts.StartActivityForResult");
    expect(activity).toContain("ActivityResultContracts.RequestPermission");
    expect(activity).toContain("NativeStatus.hasExactAlarmPermission(this)");
    expect(activity).not.toContain("waitingForExactSettings");
    expect(activity).not.toContain("protected void onResume()");
    expect(activity).not.toContain("onRequestPermissionsResult");
    expect(gradle).toContain("androidx.activity:activity:1.9.0");
  });

  it("keeps every native Adhan URL and kind identical to the web catalog", () => {
    const nativeCatalog = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanCatalog.java");
    const nativeEntries = [...nativeCatalog.matchAll(
      /Map\.entry\("([^"]+)", new ApprovedSound\("([^"]+)", SoundKind\.(REGULAR|FAJR)\)\)/gu,
    )].map((match) => ({
      id: match[1],
      audioUrl: match[2],
      kind: match[3].toLowerCase(),
    }));
    const webEntries = ADHAN_SOUNDS.map(({ id, audioUrl, kind }) => ({ id, audioUrl, kind }));

    expect(nativeEntries).toEqual(webEntries);
    expect(webEntries.find((sound) => sound.id === "fajr-madinah")?.audioUrl)
      .toBe("https://www.ashefaa.com/ruqia/Azan/19.mp3");
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

  it("clears native account state and alarms before another signed-in account can take ownership", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const protocol = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeProtocol.java");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
    const enroll = source("app/api/android/native-authority/enroll/route.ts");

    expect(provider).toContain('method: "DELETE"');
    expect(provider).toContain('send("native.account.reset"');
    expect(protocol).toContain('"native.account.reset"');
    expect(bridge).toContain('case "native.account.reset"');
    expect(bridge).toContain("PrayerScheduler.cancelAll(context)");
    expect(bridge).toContain("store.resetAccountState()");
    expect(scheduler).toContain("public static void cancelAll");
    expect(store).toContain("public int resetAccountState()");
    expect(enroll).toContain('select("user_id, credential_hash")');
    expect(enroll).toContain("credentialMatches(body.credential");
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
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");
    const work = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeWork.java");

    expect(provider).toContain("loading: authLoading");
    expect(provider).toContain("authLoading");
    expect(provider).toContain("hasLegacyNativeState(status)");
    expect(provider).toContain("syncGenerationRef");
    expect(provider).toContain("const syncGeneration = syncGenerationRef.current");
    expect(provider).toContain("syncGeneration !== syncGenerationRef.current");
    expect(provider).toContain("accountTransitioningRef.current");

    expect(store).toContain("ACCOUNT_GENERATION");
    expect(store).toContain("public int accountGeneration()");
    expect(store).toContain("public int advanceAccountGeneration()");
    expect(store).toContain("public int resetAccountState()");
    expect(worker).toContain("int generation = store.accountGeneration()");
    expect(worker).toContain("store.accountGeneration() != generation");
    expect(work).toContain("public static void cancelPrayerRefresh(Context context)");
    expect(bridge).toContain("NativeWork.cancelPrayerRefresh(context)");
    expect(bridge).toContain("store.resetAccountState()");
  });
});
