"use client";

import Link from "next/link";
import { Bell, CheckCircle2, ChevronRight, Clock, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PrayerSystemTestControls } from "@/components/settings/PrayerSystemTestControls";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useNativeAndroid } from "@/components/providers/NativeAndroidProvider";
import {
  nativePermissionDiagnostics,
  nativeStatusKind,
  type NativePermissionDiagnosticKey,
} from "@/lib/android/native-status";

const NATIVE_COPY = {
  ar: { ready: "التنبيهات والأذان الأصليان جاهزان.", needsPermission: "راجع عناصر أندرويد أدناه؛ كل إذن أو قناة يظهر بحالته المستقلة.", unhealthy: "المحرك الأصلي غير جاهز؛ ستبقى إشعارات الويب الاحتياطية فعالة.", open: "فتح الإعدادات", refresh: "إعادة فحص الحالة", ok: "جاهز", action: "يحتاج تفعيل", advisory: "موصى به" },
  en: { ready: "Native reminders and Adhan are ready.", needsPermission: "Review the Android checks below; each permission and channel has its own status.", unhealthy: "The native engine is not ready; fallback Web Push remains active.", open: "Open settings", refresh: "Check status again", ok: "Ready", action: "Needs attention", advisory: "Recommended" },
  de: { ready: "Native Erinnerungen und Adhan sind bereit.", needsPermission: "Prüfe die Android-Punkte unten; jede Berechtigung und jeder Kanal hat einen eigenen Status.", unhealthy: "Die native Engine ist nicht bereit; Web Push bleibt als Rückfall aktiv.", open: "Einstellungen öffnen", refresh: "Status erneut prüfen", ok: "Bereit", action: "Aktion nötig", advisory: "Empfohlen" },
  tr: { ready: "Yerel hatırlatıcılar ve ezan hazır.", needsPermission: "Aşağıdaki Android kontrollerini inceleyin; her izin ve kanal ayrı durum gösterir.", unhealthy: "Yerel motor hazır değil; yedek Web Push etkin kalır.", open: "Ayarları aç", refresh: "Durumu yeniden kontrol et", ok: "Hazır", action: "İşlem gerekli", advisory: "Önerilir" },
} as const;

const NATIVE_DIAGNOSTIC_LABELS: Record<string, Record<NativePermissionDiagnosticKey, string>> = {
  ar: {
    "notification-permission": "إذن الإشعارات",
    "app-notifications": "إشعارات التطبيق",
    "reminder-channel": "قناة تذكير الصلاة",
    "adhan-channel": "قناة الأذان",
    "exact-alarm": "المنبّه الدقيق",
    "battery-optimization": "تحسين البطارية",
  },
  en: {
    "notification-permission": "Notification permission",
    "app-notifications": "App notifications",
    "reminder-channel": "Prayer reminder channel",
    "adhan-channel": "Adhan channel",
    "exact-alarm": "Exact alarm access",
    "battery-optimization": "Battery optimization",
  },
  de: {
    "notification-permission": "Benachrichtigungsberechtigung",
    "app-notifications": "App-Benachrichtigungen",
    "reminder-channel": "Gebetserinnerungskanal",
    "adhan-channel": "Adhan-Kanal",
    "exact-alarm": "Exaktalarm-Zugriff",
    "battery-optimization": "Akkuoptimierung",
  },
  tr: {
    "notification-permission": "Bildirim izni",
    "app-notifications": "Uygulama bildirimleri",
    "reminder-channel": "Namaz hatırlatma kanalı",
    "adhan-channel": "Ezan kanalı",
    "exact-alarm": "Tam alarm erişimi",
    "battery-optimization": "Pil optimizasyonu",
  },
};

const timeFormatOptions = [
  { value: "24-hour" as const, labelKey: "settings.24hour" },
  { value: "12-hour" as const, labelKey: "settings.12hour" },
];

export function SettingsControls() {
  const { t, locale } = useTranslation();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const { pushStatus, busy, enableNotifications, disableNotifications } = useAppPreferences();
  const { isNative, bridgeState, status: nativeStatus, openNativeSettings, requestStatus } = useNativeAndroid();
  const nativeCopy = NATIVE_COPY[locale];
  const nativeKind = nativeStatusKind(nativeStatus);
  const nativeDiagnostics = isNative && nativeStatus ? nativePermissionDiagnostics(nativeStatus) : [];
  const nativeDiagnosticLabels = NATIVE_DIAGNOSTIC_LABELS[locale];

  const statusKey = {
    checking: "settings.pushChecking",
    unsupported: "settings.pushUnsupported",
    "ios-install-required": "settings.pushIosInstallRequired",
    unconfigured: "settings.pushUnavailable",
    denied: "settings.pushDenied",
    disabled: "settings.pushDisabled",
    enabled: "settings.pushEnabled",
    error: "settings.pushError",
  }[pushStatus];

  return (
    <div id="prayer-reminders" className="settings-group scroll-mt-24">
      <section className="settings-section">
        <h2 className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          {t("settings.notifications")}
        </h2>
        <p className="mt-1 text-sm leading-6">{t("settings.automaticContentNotifications")}</p>
        <p className="mt-3 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-sm font-semibold text-[var(--app-brand-strong)]" role="status">
          {bridgeState === "probing"
            ? t("settings.pushChecking")
            : isNative
              ? nativeKind === "ready"
                ? nativeCopy.ready
                : nativeKind === "needs-system-access"
                  ? nativeCopy.needsPermission
                  : nativeCopy.unhealthy
              : t(statusKey)}
        </p>
        {bridgeState === "probing" || !isNative || nativeDiagnostics.length === 0 ? null : (
          <div className="mt-3 grid gap-2" aria-label={t("settings.notifications")}>
            {nativeDiagnostics.map((diagnostic) => {
              const label = nativeDiagnosticLabels[diagnostic.key];
              const stateLabel = diagnostic.ok
                ? nativeCopy.ok
                : diagnostic.advisory
                  ? nativeCopy.advisory
                  : nativeCopy.action;
              const StateIcon = diagnostic.ok ? CheckCircle2 : CircleAlert;
              return (
                <div
                  key={diagnostic.key}
                  className="flex min-h-11 flex-wrap items-center gap-2 rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <StateIcon className="h-4 w-4 shrink-0 text-[var(--app-brand)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--app-text)]">{label}</span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--app-text-secondary)]">{stateLabel}</span>
                  {diagnostic.ok ? null : (
                    <Button
                      variant="ghost"
                      className="min-h-11 shrink-0 px-3 py-1.5 text-xs"
                      onClick={() => openNativeSettings(diagnostic.key)}
                    >
                      {nativeCopy.open}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {bridgeState === "probing" ? null : isNative ? (
          <Button variant="ghost" className="mt-3 w-full" onClick={requestStatus}>{nativeCopy.refresh}</Button>
        ) : pushStatus === "enabled" ? (
          <Button variant="ghost" className="mt-3 w-full" disabled={busy} onClick={() => void disableNotifications()}>{t("settings.disablePush")}</Button>
        ) : pushStatus === "disabled" || pushStatus === "error" ? (
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void enableNotifications()}>{t("settings.enablePush")}</Button>
        ) : null}
      </section>

      <Link href="/#prayer-times" className="settings-section flex min-h-14 items-center gap-3">
        <Bell className="h-4 w-4 shrink-0 text-[var(--app-brand)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--app-text)]">{t("phase1.manageReminders")}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
      </Link>

      <PrayerSystemTestControls />

      <section className="settings-section">
        <h2 className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          {t("settings.timeFormat")}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-[var(--app-surface-soft)] p-1.5">
          {timeFormatOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFormat(item.value)}
              aria-pressed={timeFormat === item.value}
              className={`min-h-11 rounded-[11px] px-3 text-sm font-semibold ${timeFormat === item.value ? "bg-[var(--app-surface)] text-[var(--app-brand-strong)] shadow-sm" : "text-[var(--app-text-secondary)]"}`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
