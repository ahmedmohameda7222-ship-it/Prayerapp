import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android app-selected locale contract", () => {
  it("sends the selected web-app locale with native configuration", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");

    expect(provider).toContain('import { useLocale } from "@/lib/i18n/context"');
    expect(provider).toContain("const { locale } = useLocale()");
    expect(provider).toContain("locale,");
  });

  it("persists native locale independently from account-scoped schedule state", () => {
    const store = source("android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java");

    expect(store).toContain('private static final String APP_LOCALE = "app-locale"');
    expect(store).toContain("putString(APP_LOCALE, config.locale)");
    expect(store).toContain("public String appLocale()");

    const resetStart = store.indexOf("public int resetAccountStateAndQueueAuthorityRevocation()");
    const resetEnd = store.indexOf("public void clearAccountState()", resetStart);
    const resetBody = store.slice(resetStart, resetEnd);
    expect(resetBody).not.toContain("remove(APP_LOCALE)");
  });

  it("uses stored app locale for native channel, reminder, prayer, and Adhan copy", () => {
    const notifications = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerNotifications.java");
    const prayer = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/Prayer.java");
    const adhan = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java");

    expect(notifications).toContain("AppLocale.localizedContext");
    expect(prayer).toContain("AppLocale.localizedContext");
    expect(adhan).toContain("AppLocale.localizedContext");
  });

  it("refreshes notification channel labels after the new locale is saved atomically", () => {
    const scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
    const bridge = source("android-twa/app/src/main/java/de/donaumoschee/app/bridge/BridgeHandler.java");
    const saveIndex = scheduler.indexOf("store.saveConfigIfGeneration(config.source, now, generation)");
    const refreshIndex = scheduler.indexOf("PrayerNotifications.createChannels(context)", saveIndex);
    const cancelIndex = scheduler.indexOf("cancelStored(context, store, generation)", refreshIndex);

    expect(saveIndex).toBeGreaterThanOrEqual(0);
    expect(refreshIndex).toBeGreaterThan(saveIndex);
    expect(cancelIndex).toBeGreaterThan(refreshIndex);
    expect(bridge).toContain("PrayerScheduler.replaceConfigAndReschedule(context, payload, Instant.now())");
    expect(bridge).not.toContain("store.saveConfig(payload");
  });
});
