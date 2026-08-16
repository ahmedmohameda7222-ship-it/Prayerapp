"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatTime } from "@/lib/time-format";
import { getIqama, prayerOrder } from "@/lib/prayer-utils";
import type { Locale } from "@/lib/i18n/types";
import type { PrayerName, PrayerTime } from "@/lib/types";

type ReminderPrayer = Exclude<PrayerName, "sunrise">;
type ReminderLeadMinutes = 0 | 5 | 10 | 15;
type ReminderPreference = { enabled: boolean; leadMinutes: ReminderLeadMinutes };
type ReminderRow = { prayer: string; enabled: boolean; lead_minutes: number | null };

const reminderPrayers = new Set<ReminderPrayer>(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
const reminderOptions: Array<ReminderLeadMinutes | null> = [15, 10, 5, 0, null];

const REMINDER_COPY: Record<Locale, {
  title: string;
  description: string;
  off: string;
  adhanOnly: string;
  before: (minutes: number) => string;
  plusAdhan: string;
  close: string;
  notificationFailed: string;
  notificationDenied: string;
  installRequired: string;
  unsupported: string;
  unavailable: string;
  savedBefore: (minutes: number) => string;
  savedAdhan: string;
  maghribProgram: string;
}> = {
  ar: {
    title: "تذكير الصلاة",
    description: "اختر متى تريد التذكير. عند تفعيل تذكير مسبق سيصلك إشعار آخر عند وقت الأذان.",
    off: "إيقاف التذكير",
    adhanOnly: "عند الأذان فقط",
    before: (minutes) => `قبل الأذان بـ ${minutes} دقيقة`,
    plusAdhan: "+ إشعار عند الأذان",
    close: "إغلاق",
    notificationFailed: "تعذر تفعيل إشعارات الجهاز. تحقق من إذن الإشعارات وحاول مرة أخرى.",
    notificationDenied: "إذن الإشعارات محظور. فعّله من إعدادات الجهاز أو المتصفح ثم حاول مرة أخرى.",
    installRequired: "على iPhone أو iPad، ثبّت التطبيق من Safari وافتحه من الشاشة الرئيسية أولًا.",
    unsupported: "هذا الجهاز أو المتصفح لا يدعم الإشعارات الفورية.",
    unavailable: "إشعارات التطبيق غير متاحة على الخادم حاليًا.",
    savedBefore: (minutes) => `${minutes} د`,
    savedAdhan: "أذان",
    maghribProgram: "برنامج المغرب",
  },
  en: {
    title: "Prayer reminder",
    description: "Choose when to be reminded. A pre-prayer reminder also includes another notification at Adhan time.",
    off: "Turn reminder off",
    adhanOnly: "At Adhan only",
    before: (minutes) => `${minutes} minutes before Adhan`,
    plusAdhan: "+ notification at Adhan",
    close: "Close",
    notificationFailed: "Could not enable device notifications. Check notification permission and try again.",
    notificationDenied: "Notifications are blocked. Enable them in device or browser settings and try again.",
    installRequired: "On iPhone or iPad, install the app from Safari and open it from the Home Screen first.",
    unsupported: "Push notifications are not supported on this device or browser.",
    unavailable: "App notifications are not configured on the server right now.",
    savedBefore: (minutes) => `${minutes}m`,
    savedAdhan: "Adhan",
    maghribProgram: "Maghrib program",
  },
  de: {
    title: "Gebetserinnerung",
    description: "Wähle den Zeitpunkt. Bei einer Vorab-Erinnerung erhältst du zusätzlich eine Benachrichtigung zur Adhan-Zeit.",
    off: "Erinnerung ausschalten",
    adhanOnly: "Nur zum Adhan",
    before: (minutes) => `${minutes} Minuten vor dem Adhan`,
    plusAdhan: "+ Benachrichtigung zum Adhan",
    close: "Schließen",
    notificationFailed: "Gerätebenachrichtigungen konnten nicht aktiviert werden. Prüfe die Berechtigung und versuche es erneut.",
    notificationDenied: "Benachrichtigungen sind blockiert. Aktiviere sie in den Geräte- oder Browser-Einstellungen.",
    installRequired: "Installiere die App auf iPhone oder iPad zuerst über Safari und öffne sie vom Home-Bildschirm.",
    unsupported: "Push-Benachrichtigungen werden auf diesem Gerät oder Browser nicht unterstützt.",
    unavailable: "App-Benachrichtigungen sind auf dem Server derzeit nicht eingerichtet.",
    savedBefore: (minutes) => `${minutes}m`,
    savedAdhan: "Adhan",
    maghribProgram: "Maghrib-Programm",
  },
  tr: {
    title: "Namaz hatırlatıcısı",
    description: "Hatırlatma zamanını seçin. Önceden hatırlatma seçerseniz ezan vaktinde bir bildirim daha gelir.",
    off: "Hatırlatıcıyı kapat",
    adhanOnly: "Sadece ezan vaktinde",
    before: (minutes) => `Ezandan ${minutes} dakika önce`,
    plusAdhan: "+ ezan vaktinde bildirim",
    close: "Kapat",
    notificationFailed: "Cihaz bildirimleri etkinleştirilemedi. Bildirim iznini kontrol edip tekrar deneyin.",
    notificationDenied: "Bildirimler engellenmiş. Cihaz veya tarayıcı ayarlarından etkinleştirin.",
    installRequired: "iPhone veya iPad'de uygulamayı önce Safari'den yükleyip Ana Ekrandan açın.",
    unsupported: "Bu cihaz veya tarayıcı anlık bildirimleri desteklemiyor.",
    unavailable: "Uygulama bildirimleri şu anda sunucuda yapılandırılmamış.",
    savedBefore: (minutes) => `${minutes}d`,
    savedAdhan: "Ezan",
    maghribProgram: "Akşam programı",
  },
};

function isReminderPrayer(value: string | null): value is ReminderPrayer {
  return Boolean(value && reminderPrayers.has(value as ReminderPrayer));
}

function normalizeLeadMinutes(value: number | null | undefined): ReminderLeadMinutes {
  return value === 5 || value === 10 || value === 15 ? value : 0;
}

export function HomePrayerTimesCard({
  prayer,
  activePrayer,
}: {
  prayer: PrayerTime;
  activePrayer?: PrayerName;
}) {
  const { t, locale } = useTranslation();
  const copy = REMINDER_COPY[locale];
  const { timeFormat } = useTimeFormat();
  const { user } = usePublicAuth();
  const { pushStatus, enableNotifications } = useAppPreferences();
  const [preferences, setPreferences] = useState<Map<ReminderPrayer, ReminderPreference>>(() => new Map());
  const [loaded, setLoaded] = useState(false);
  const [savingPrayer, setSavingPrayer] = useState<ReminderPrayer | null>(null);
  const [editingPrayer, setEditingPrayer] = useState<ReminderPrayer | null>(null);
  const [error, setError] = useState("");
  const handledIntent = useRef(false);
  const reminderSaveError = t("phase1.reminderSaveError");
  const reminderDescription = t("phase1.reminderDescription");
  const reminderOn = t("phase1.reminderOn");
  const reminderOff = t("phase1.reminderOff");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoaded(false);
      setError("");
      if (!user) {
        setPreferences(new Map());
        setLoaded(true);
        return;
      }
      const client = createClient();
      if (!client) {
        setError(reminderSaveError);
        setLoaded(true);
        return;
      }
      const { data, error: queryError } = await client
        .from("user_prayer_reminders")
        .select("prayer, enabled, lead_minutes")
        .eq("user_id", user.id);
      if (!active) return;
      if (queryError) {
        console.warn("Prayer reminder load failed", queryError);
        setError(reminderSaveError);
        setPreferences(new Map());
      } else {
        const next = new Map<ReminderPrayer, ReminderPreference>();
        for (const row of (data || []) as ReminderRow[]) {
          if (!isReminderPrayer(row.prayer)) continue;
          next.set(row.prayer, {
            enabled: row.enabled,
            leadMinutes: normalizeLeadMinutes(row.lead_minutes),
          });
        }
        setPreferences(next);
      }
      setLoaded(true);
    };
    void load();
    return () => { active = false; };
  }, [reminderSaveError, user]);

  const notificationError = useCallback(() => {
    if (pushStatus === "denied") return copy.notificationDenied;
    if (pushStatus === "ios-install-required") return copy.installRequired;
    if (pushStatus === "unsupported") return copy.unsupported;
    if (pushStatus === "unconfigured") return copy.unavailable;
    return copy.notificationFailed;
  }, [copy, pushStatus]);

  const saveReminder = useCallback(async (name: ReminderPrayer, option: ReminderLeadMinutes | null) => {
    if (!user || savingPrayer) return false;
    const nextEnabled = option !== null;
    const leadMinutes = option ?? 0;
    setSavingPrayer(name);
    setError("");

    try {
      if (nextEnabled && pushStatus !== "enabled") {
        const notificationReady = await enableNotifications();
        if (!notificationReady) {
          setError(notificationError());
          return false;
        }
      }

      const client = createClient();
      if (!client) throw new Error("Supabase unavailable");
      const { error: saveError } = await client.from("user_prayer_reminders").upsert({
        user_id: user.id,
        prayer: name,
        enabled: nextEnabled,
        lead_minutes: leadMinutes,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: "user_id,prayer" });
      if (saveError) throw saveError;

      setPreferences((current) => {
        const next = new Map(current);
        next.set(name, { enabled: nextEnabled, leadMinutes });
        return next;
      });
      setEditingPrayer(null);
      return true;
    } catch (saveError) {
      console.warn("Prayer reminder save failed", saveError);
      setError(reminderSaveError);
      return false;
    } finally {
      setSavingPrayer(null);
    }
  }, [enableNotifications, notificationError, pushStatus, reminderSaveError, savingPrayer, user]);

  useEffect(() => {
    if (!loaded || !user || handledIntent.current) return;
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("reminder");
    if (!isReminderPrayer(requested)) return;
    handledIntent.current = true;
    setEditingPrayer(requested);
    url.searchParams.delete("reminder");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [loaded, user]);

  const rows = useMemo(() => prayerOrder.map((name) => {
    const canonicalIqama = name === "maghrib"
      ? prayer.maghribProgram?.maghribIqamaTime || getIqama(prayer, name)
      : getIqama(prayer, name);
    return { name, adhan: prayer[name], iqama: canonicalIqama };
  }), [prayer]);

  function clickReminder(name: ReminderPrayer) {
    if (!user) {
      const next = `/?reminder=${name}#prayer-times`;
      window.location.assign(`/account/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    setError("");
    setEditingPrayer(name);
  }

  const editingPreference = editingPrayer ? preferences.get(editingPrayer) : undefined;
  const selectedOption = editingPreference?.enabled ? editingPreference.leadMinutes : null;

  return (
    <section id="prayer-times" aria-labelledby="home-prayer-times-title" className="home-prayer-board" data-testid="home-prayer-board">
      <div className="p-4 pb-3">
        <h2 id="home-prayer-times-title" className="text-lg font-bold text-[var(--home-text)]">{t("prayer.todaysPrayerTimes")}</h2>
        <p className="mt-1 text-[13px] leading-5 text-[var(--home-text-secondary)]">{reminderDescription}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_60px] items-center gap-2 border-y border-[var(--home-divider)] bg-[var(--home-surface-subtle)] px-3 py-2.5 text-xs font-semibold text-[var(--home-text-secondary)] sm:px-4">
        <span>{t("prayer.prayer")}</span>
        <span>{t("prayer.azan")}</span>
        <span>{t("prayer.iqama")}</span>
        <span className="sr-only">{copy.title}</span>
      </div>
      <div className="divide-y divide-[var(--home-divider)]">
        {rows.map(({ name, adhan, iqama }) => {
          const isActive = name === activePrayer;
          const canRemind = name !== "sunrise";
          const preference = canRemind ? preferences.get(name as ReminderPrayer) : undefined;
          const isEnabled = Boolean(preference?.enabled);
          const leadLabel = isEnabled
            ? preference?.leadMinutes
              ? copy.savedBefore(preference.leadMinutes)
              : copy.savedAdhan
            : "";

          return (
            <div key={name} className={`border-s-[3px] ${isActive ? "border-s-[var(--home-brand)] bg-[var(--home-brand-soft)]" : "border-s-transparent"}`} data-prayer-row={name} data-active={isActive ? "true" : undefined}>
              <div className="grid min-h-14 grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_60px] items-center gap-2 px-3 py-2.5 sm:px-4">
                <span className={`min-w-0 text-[15px] font-bold ${isActive ? "text-[var(--home-brand-strong)]" : "text-[var(--home-text)]"}`}>{t(`prayer.${name}`)}</span>
                <span dir="ltr" className="home-tabular text-[15px] font-bold text-[var(--home-text)]">{formatTime(adhan, timeFormat)}</span>
                <span dir="ltr" className="home-tabular text-[15px] font-bold text-[var(--home-text-secondary)]">{iqama ? formatTime(iqama, timeFormat) : "—"}</span>
                {canRemind ? (
                  <button
                    type="button"
                    disabled={!loaded || savingPrayer === name}
                    onClick={() => clickReminder(name as ReminderPrayer)}
                    aria-pressed={isEnabled}
                    aria-label={`${t(`prayer.${name}`)}: ${isEnabled ? reminderOn : reminderOff}`}
                    className={`flex h-12 w-[56px] flex-col items-center justify-center rounded-[10px] transition-colors disabled:text-[var(--home-disabled)] disabled:opacity-60 ${isEnabled ? "bg-[var(--home-brand-soft)] text-[var(--home-brand-strong)]" : "bg-transparent text-[var(--home-brand)] hover:bg-[var(--home-brand-soft)]"}`}
                  >
                    <Bell className={`h-[19px] w-[19px] ${isEnabled ? "fill-current" : ""}`} aria-hidden="true" />
                    {leadLabel ? <span className="mt-0.5 text-[9px] font-extrabold leading-none">{leadLabel}</span> : null}
                  </button>
                ) : <span aria-hidden="true" className="text-center text-[var(--home-text-secondary)]">—</span>}
              </div>

              {name === "maghrib" && prayer.maghribProgram?.enabled ? (
                <div className="border-t border-[var(--home-divider)] bg-[var(--home-surface-subtle)] px-4 py-2.5 text-[var(--home-text-secondary)]" data-testid="maghrib-program">
                  <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[var(--home-brand-strong)]">{copy.maghribProgram}</p>
                  {prayer.maghribProgram.lessonTitle ? (
                    <p className="py-2 text-[13px] leading-5">
                      <span className="font-bold text-[var(--home-brand-strong)]">{t("prayer.khatira")}: </span>
                      {prayer.maghribProgram.lessonTitle}{prayer.maghribProgram.lessonDurationMinutes ? ` · ${prayer.maghribProgram.lessonDurationMinutes} ${t("prayer.minutes")}` : ""}
                    </p>
                  ) : null}
                  {prayer.maghribProgram.combinedIshaTime ? (
                    <p className="flex items-center justify-between gap-3 border-t border-[var(--home-divider)] py-2 text-[13px] leading-5">
                      <span className="font-bold text-[var(--home-brand-strong)]">{t("phase1.combinedIsha")}</span>
                      <span dir="ltr" className="home-tabular font-bold text-[var(--home-text)]">{formatTime(prayer.maghribProgram.combinedIshaTime, timeFormat)}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      {editingPrayer ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" data-testid="prayer-reminder-dialog">
          <button type="button" aria-label={copy.close} className="absolute inset-0 bg-black/35" onClick={() => setEditingPrayer(null)} />
          <div role="dialog" aria-modal="true" aria-labelledby="prayer-reminder-dialog-title" className="relative z-10 w-full max-w-md rounded-t-[22px] border border-[var(--home-divider)] bg-[var(--home-surface)] p-4 pb-[calc(18px+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[22px] sm:pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p id="prayer-reminder-dialog-title" className="text-lg font-extrabold text-[var(--home-text)]">{copy.title} · {t(`prayer.${editingPrayer}`)}</p>
                <p className="mt-1 text-[13px] leading-5 text-[var(--home-text-secondary)]">{copy.description}</p>
              </div>
              <button type="button" aria-label={copy.close} onClick={() => setEditingPrayer(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--home-surface-subtle)] text-[var(--home-text-secondary)]">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--home-divider)]">
              {reminderOptions.map((option, index) => {
                const selected = selectedOption === option;
                const label = option === null ? copy.off : option === 0 ? copy.adhanOnly : copy.before(option);
                return (
                  <button
                    key={option === null ? "off" : option}
                    type="button"
                    disabled={savingPrayer === editingPrayer}
                    onClick={() => void saveReminder(editingPrayer, option)}
                    className={`flex min-h-[58px] w-full items-center gap-3 px-4 text-start disabled:opacity-60 ${index ? "border-t border-[var(--home-divider)]" : ""} ${selected ? "bg-[var(--home-brand-soft)]" : "bg-[var(--home-surface)]"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-bold ${selected ? "text-[var(--home-brand-strong)]" : "text-[var(--home-text)]"}`}>{label}</span>
                      {option !== null && option > 0 ? <span className="mt-0.5 block text-[11px] font-semibold text-[var(--home-text-secondary)]">{copy.plusAdhan}</span> : null}
                    </span>
                    {selected ? <Check className="h-5 w-5 shrink-0 text-[var(--home-brand)]" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
