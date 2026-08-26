"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, Play, Square, X } from "lucide-react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useNativeAndroid } from "@/components/providers/NativeAndroidProvider";
import { useAdhanAudio } from "@/components/providers/AdhanAudioProvider";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatTime } from "@/lib/time-format";
import { getIqama, prayerOrder } from "@/lib/prayer-utils";
import { getPrayerDisplayNameKey } from "@/lib/prayer-display-name";
import {
  defaultAdhanSoundIdForPrayer,
  getAdhanSoundLabel,
  getAdhanSoundsForPrayer,
  normalizeAdhanSoundId,
  type AdhanSoundId,
} from "@/lib/adhan-audio";
import type { Locale } from "@/lib/i18n/types";
import type { PrayerName, PrayerTime } from "@/lib/types";
import { publishNativePrayerPreferences } from "@/lib/android/native-web";

type ReminderPrayer = Exclude<PrayerName, "sunrise">;
type ReminderLeadMinutes = 0 | 5 | 10 | 15;
type ReminderPreference = {
  enabled: boolean;
  leadMinutes: ReminderLeadMinutes;
  adhanSoundId: AdhanSoundId;
};
type ReminderRow = {
  prayer: string;
  enabled: boolean;
  lead_minutes: number | null;
  adhan_sound_id: string | null;
};

const reminderPrayers = new Set<ReminderPrayer>(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
const reminderOptions: ReminderLeadMinutes[] = [15, 10, 5, 0];

const REMINDER_COPY: Record<Locale, {
  title: string;
  timing: string;
  chooseAdhan: string;
  off: string;
  atAdhan: string;
  minutes: (minutes: number) => string;
  preview: string;
  stop: string;
  select: string;
  selected: string;
  save: string;
  saving: string;
  close: string;
  playbackError: string;
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
    title: "إعداد الصلاة",
    timing: "موعد التنبيه",
    chooseAdhan: "اختار الأذان",
    off: "إيقاف التنبيه",
    atAdhan: "وقت الأذان",
    minutes: (minutes) => `${minutes} د`,
    preview: "استماع",
    stop: "إيقاف",
    select: "اختيار",
    selected: "مختار",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    close: "إغلاق",
    playbackError: "تعذر تشغيل الأذان. حاول مرة أخرى.",
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
    title: "Prayer settings",
    timing: "Reminder time",
    chooseAdhan: "Choose Adhan",
    off: "Turn reminder off",
    atAdhan: "At Adhan",
    minutes: (minutes) => `${minutes} min`,
    preview: "Preview",
    stop: "Stop",
    select: "Select",
    selected: "Selected",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    playbackError: "Could not play this Adhan. Try again.",
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
    title: "Gebetseinstellungen",
    timing: "Erinnerungszeit",
    chooseAdhan: "Adhan auswählen",
    off: "Erinnerung ausschalten",
    atAdhan: "Zum Adhan",
    minutes: (minutes) => `${minutes} Min.`,
    preview: "Anhören",
    stop: "Stoppen",
    select: "Auswählen",
    selected: "Ausgewählt",
    save: "Speichern",
    saving: "Speichern…",
    close: "Schließen",
    playbackError: "Der Adhan konnte nicht abgespielt werden. Versuche es erneut.",
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
    title: "Namaz ayarları",
    timing: "Hatırlatma zamanı",
    chooseAdhan: "Ezan seç",
    off: "Hatırlatıcıyı kapat",
    atAdhan: "Ezan vaktinde",
    minutes: (minutes) => `${minutes} dk`,
    preview: "Dinle",
    stop: "Durdur",
    select: "Seç",
    selected: "Seçili",
    save: "Kaydet",
    saving: "Kaydediliyor…",
    close: "Kapat",
    playbackError: "Ezan oynatılamadı. Tekrar deneyin.",
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
  const { isNative, requestPermissions } = useNativeAndroid();
  const {
    playbackStatus,
    activeSoundId,
    setPrayerSound,
    previewSound,
    stopAudio,
  } = useAdhanAudio();
  const [preferences, setPreferences] = useState<Map<ReminderPrayer, ReminderPreference>>(() => new Map());
  const [loaded, setLoaded] = useState(false);
  const [savingPrayer, setSavingPrayer] = useState<ReminderPrayer | null>(null);
  const [editingPrayer, setEditingPrayer] = useState<ReminderPrayer | null>(null);
  const [draftLeadMinutes, setDraftLeadMinutes] = useState<ReminderLeadMinutes | null>(null);
  const [draftSoundId, setDraftSoundId] = useState<AdhanSoundId>(defaultAdhanSoundIdForPrayer("dhuhr"));
  const [error, setError] = useState("");
  const handledIntent = useRef(false);
  const editorPanelRef = useRef<HTMLDivElement>(null);
  const reminderSaveError = t("phase1.reminderSaveError");
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
        .select("prayer, enabled, lead_minutes, adhan_sound_id")
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
            adhanSoundId: normalizeAdhanSoundId(row.adhan_sound_id, row.prayer),
          });
        }
        setPreferences(next);
      }
      setLoaded(true);
    };
    void load();
    return () => { active = false; };
  }, [reminderSaveError, user]);

  useEffect(() => {
    if (!loaded || !user) return;
    publishNativePrayerPreferences(Array.from(reminderPrayers, (name) => {
      const preference = preferences.get(name);
      return {
        prayer: name,
        enabled: Boolean(preference?.enabled),
        leadMinutes: preference?.leadMinutes || 0,
        adhanSoundId: normalizeAdhanSoundId(preference?.adhanSoundId, name),
      };
    }));
  }, [loaded, preferences, user]);

  const notificationError = useCallback(() => {
    if (pushStatus === "denied") return copy.notificationDenied;
    if (pushStatus === "ios-install-required") return copy.installRequired;
    if (pushStatus === "unsupported") return copy.unsupported;
    if (pushStatus === "unconfigured") return copy.unavailable;
    return copy.notificationFailed;
  }, [copy, pushStatus]);

  const closeEditor = useCallback(() => {
    stopAudio();
    setEditingPrayer(null);
    setError("");
  }, [stopAudio]);

  const openEditor = useCallback((name: ReminderPrayer) => {
    const current = preferences.get(name);
    setDraftLeadMinutes(current?.enabled ? current.leadMinutes : null);
    setDraftSoundId(normalizeAdhanSoundId(current?.adhanSoundId, name));
    setError("");
    stopAudio();
    setEditingPrayer(name);
  }, [preferences, stopAudio]);

  useEffect(() => {
    if (!editingPrayer) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      const panel = editorPanelRef.current;
      if (!panel || !(event.target instanceof Node) || panel.contains(event.target)) return;
      closeEditor();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeEditor, editingPrayer]);

  const saveReminder = useCallback(async (
    name: ReminderPrayer,
    leadMinutes: ReminderLeadMinutes | null,
    requestedSoundId: AdhanSoundId,
  ) => {
    if (!user || savingPrayer) return false;
    const nextEnabled = leadMinutes !== null;
    const normalizedLeadMinutes = leadMinutes ?? 0;
    const adhanSoundId = normalizeAdhanSoundId(requestedSoundId, name);
    setSavingPrayer(name);
    setError("");

    try {
      if (nextEnabled && isNative) {
        requestPermissions();
      } else if (nextEnabled && pushStatus !== "enabled") {
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
        lead_minutes: normalizedLeadMinutes,
        adhan_sound_id: adhanSoundId,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: "user_id,prayer" });
      if (saveError) throw saveError;

      setPreferences((current) => {
        const next = new Map(current);
        next.set(name, {
          enabled: nextEnabled,
          leadMinutes: normalizedLeadMinutes,
          adhanSoundId,
        });
        return next;
      });
      setPrayerSound(name, adhanSoundId);
      stopAudio();
      setEditingPrayer(null);
      return true;
    } catch (saveError) {
      console.warn("Prayer reminder save failed", saveError);
      setError(reminderSaveError);
      return false;
    } finally {
      setSavingPrayer(null);
    }
  }, [enableNotifications, isNative, notificationError, pushStatus, reminderSaveError, requestPermissions, savingPrayer, setPrayerSound, stopAudio, user]);

  useEffect(() => {
    if (!loaded || !user || handledIntent.current) return;
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("reminder");
    if (!isReminderPrayer(requested)) return;
    handledIntent.current = true;
    const timer = window.setTimeout(() => openEditor(requested), 0);
    url.searchParams.delete("reminder");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    return () => window.clearTimeout(timer);
  }, [loaded, openEditor, user]);

  useEffect(() => () => stopAudio(), [stopAudio]);

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
    openEditor(name);
  }

  const soundOptions = editingPrayer ? getAdhanSoundsForPrayer(editingPrayer) : [];
  const audioFailed = playbackStatus === "blocked" || playbackStatus === "error";

  return (
    <section id="prayer-times" aria-labelledby="home-prayer-times-title" className="home-prayer-board" data-testid="home-prayer-board">
      <div className="p-4 pb-3">
        <h2 id="home-prayer-times-title" className="text-lg font-bold text-[var(--home-text)]">{t("prayer.todaysPrayerTimes")}</h2>
      </div>
      <div className="grid grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_60px] items-center gap-2 border-y border-s-[3px] border-s-transparent border-[var(--home-divider)] bg-[var(--home-surface-subtle)] px-3 py-2.5 text-xs font-semibold text-[var(--home-text-secondary)] sm:px-4">
        <span className="text-start">{t("prayer.prayer")}</span>
        <span className="text-center">{t("prayer.azan")}</span>
        <span className="text-center">{t("prayer.iqama")}</span>
        <span className="sr-only">{copy.title}</span>
      </div>
      <div className="divide-y divide-[var(--home-divider)]">
        {rows.map(({ name, adhan, iqama }) => {
          const isActive = name === activePrayer;
          const canRemind = name !== "sunrise";
          const preference = canRemind ? preferences.get(name as ReminderPrayer) : undefined;
          const isEnabled = Boolean(preference?.enabled);
          const displayName = t(getPrayerDisplayNameKey(name, prayer.date));
          const leadLabel = isEnabled
            ? preference?.leadMinutes
              ? copy.savedBefore(preference.leadMinutes)
              : copy.savedAdhan
            : "";

          return (
            <div key={name} className={`border-s-[3px] ${isActive ? "border-s-[var(--home-brand)] bg-[var(--home-brand-soft)]" : "border-s-transparent"}`} data-prayer-row={name} data-active={isActive ? "true" : undefined}>
              <div className="grid min-h-14 grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_60px] items-center gap-2 px-3 py-2.5 sm:px-4">
                <span className={`min-w-0 text-start text-[15px] font-bold ${isActive ? "text-[var(--home-brand-strong)]" : "text-[var(--home-text)]"}`}>{displayName}</span>
                <span dir="ltr" className="home-tabular text-center text-[15px] font-bold text-[var(--home-text)]">{formatTime(adhan, timeFormat)}</span>
                <span dir="ltr" className="home-tabular text-center text-[15px] font-bold text-[var(--home-text-secondary)]">{iqama ? formatTime(iqama, timeFormat) : "—"}</span>
                {canRemind ? (
                  <button
                    type="button"
                    disabled={!loaded || savingPrayer === name}
                    onClick={() => clickReminder(name as ReminderPrayer)}
                    aria-pressed={isEnabled}
                    aria-label={`${displayName}: ${isEnabled ? reminderOn : reminderOff}`}
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

      {error && !editingPrayer ? <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      {editingPrayer ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" data-testid="prayer-reminder-dialog">
          <button type="button" aria-label={copy.close} className="absolute inset-0 bg-black/35" onClick={closeEditor} />
          <div ref={editorPanelRef} role="dialog" aria-modal="true" aria-labelledby="prayer-reminder-dialog-title" className="relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] border border-[var(--home-divider)] bg-[var(--home-surface)] shadow-2xl sm:max-h-[82dvh] sm:rounded-[22px]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--home-divider)] px-4 py-3.5">
              <p id="prayer-reminder-dialog-title" className="min-w-0 text-lg font-extrabold text-[var(--home-text)]">{copy.title} · {t(getPrayerDisplayNameKey(editingPrayer, prayer.date))}</p>
              <button type="button" aria-label={copy.close} onClick={closeEditor} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--home-surface-subtle)] text-[var(--home-text-secondary)]">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <section aria-labelledby="reminder-timing-title">
                <h3 id="reminder-timing-title" className="text-sm font-extrabold text-[var(--home-text)]">{copy.timing}</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {reminderOptions.map((option) => {
                    const selected = draftLeadMinutes === option;
                    const label = option === 0 ? copy.atAdhan : copy.minutes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setDraftLeadMinutes(option)}
                        className={`flex min-h-12 items-center justify-center gap-2 rounded-[13px] border px-3 text-sm font-bold ${selected ? "border-[var(--home-brand)] bg-[var(--home-brand-soft)] text-[var(--home-brand-strong)]" : "border-[var(--home-divider)] bg-[var(--home-surface)] text-[var(--home-text)]"}`}
                      >
                        {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-pressed={draftLeadMinutes === null}
                  onClick={() => setDraftLeadMinutes(null)}
                  className={`mt-2 min-h-11 w-full rounded-[13px] border px-3 text-sm font-bold ${draftLeadMinutes === null ? "border-[var(--home-brand)] bg-[var(--home-brand-soft)] text-[var(--home-brand-strong)]" : "border-[var(--home-divider)] bg-[var(--home-surface)] text-[var(--home-text-secondary)]"}`}
                >
                  {copy.off}
                </button>
              </section>

              <section aria-labelledby="prayer-adhan-title" className="mt-6">
                <h3 id="prayer-adhan-title" className="text-sm font-extrabold text-[var(--home-text)]">{copy.chooseAdhan}</h3>
                <div className="mt-3 overflow-hidden rounded-[16px] border border-[var(--home-divider)]" data-testid="per-prayer-adhan-options">
                  {soundOptions.map((sound, index) => {
                    const selected = draftSoundId === sound.id;
                    const playing = playbackStatus === "playing" && activeSoundId === sound.id;
                    return (
                      <div key={sound.id} className={`bg-[var(--home-surface)] px-3 py-3 ${index ? "border-t border-[var(--home-divider)]" : ""}`}>
                        <p className={`text-sm font-bold ${selected ? "text-[var(--home-brand-strong)]" : "text-[var(--home-text)]"}`}>{getAdhanSoundLabel(sound.id, locale)}</p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => playing ? stopAudio() : void previewSound(sound.id)}
                            className="flex min-h-11 items-center justify-center gap-2 rounded-[11px] border border-[var(--home-divider)] px-3 text-xs font-bold text-[var(--home-brand-strong)]"
                            aria-label={`${playing ? copy.stop : copy.preview}: ${getAdhanSoundLabel(sound.id, locale)}`}
                          >
                            {playing ? <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> : <Play className="h-4 w-4 fill-current" aria-hidden="true" />}
                            {playing ? copy.stop : copy.preview}
                          </button>
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setDraftSoundId(sound.id)}
                            className={`flex min-h-11 items-center justify-center gap-2 rounded-[11px] border px-3 text-xs font-bold ${selected ? "border-[var(--home-brand)] bg-[var(--home-brand-soft)] text-[var(--home-brand-strong)]" : "border-[var(--home-divider)] text-[var(--home-text)]"}`}
                          >
                            {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                            {selected ? copy.selected : copy.select}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {audioFailed ? <p role="alert" className="mt-3 rounded-[12px] bg-red-50 p-3 text-xs font-semibold text-red-800">{copy.playbackError}</p> : null}
              {error ? <p role="alert" className="mt-3 rounded-[12px] bg-red-50 p-3 text-xs font-semibold text-red-800">{error}</p> : null}
            </div>

            <div className="border-t border-[var(--home-divider)] bg-[var(--home-surface)] px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
              <button
                type="button"
                disabled={savingPrayer === editingPrayer}
                onClick={() => void saveReminder(editingPrayer, draftLeadMinutes, draftSoundId)}
                className="min-h-12 w-full rounded-[14px] bg-[var(--home-brand)] px-4 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {savingPrayer === editingPrayer ? copy.saving : copy.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
