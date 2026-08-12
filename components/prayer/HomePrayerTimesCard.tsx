"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatTime } from "@/lib/time-format";
import { getIqama, prayerOrder } from "@/lib/prayer-utils";
import type { PrayerName, PrayerTime } from "@/lib/types";

type ReminderPrayer = Exclude<PrayerName, "sunrise">;
type ReminderRow = { prayer: string; enabled: boolean };
const reminderPrayers = new Set<ReminderPrayer>(["fajr", "dhuhr", "asr", "maghrib", "isha"]);

function isReminderPrayer(value: string | null): value is ReminderPrayer {
  return Boolean(value && reminderPrayers.has(value as ReminderPrayer));
}

export function HomePrayerTimesCard({ prayer, activePrayer }: { prayer: PrayerTime; activePrayer?: PrayerName }) {
  const { t } = useTranslation();
  const { timeFormat } = useTimeFormat();
  const { user } = usePublicAuth();
  const { pushStatus, enableNotifications } = useAppPreferences();
  const [enabled, setEnabled] = useState<Set<ReminderPrayer>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [savingPrayer, setSavingPrayer] = useState<ReminderPrayer | null>(null);
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
        setEnabled(new Set());
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
        .select("prayer, enabled")
        .eq("user_id", user.id);
      if (!active) return;
      if (queryError) {
        setError(reminderSaveError);
        setEnabled(new Set());
      } else {
        const reminderRows = (data || []) as ReminderRow[];
        setEnabled(new Set(reminderRows.filter((row) => row.enabled && isReminderPrayer(row.prayer)).map((row) => row.prayer as ReminderPrayer)));
      }
      setLoaded(true);
    };
    void load();
    return () => { active = false; };
  }, [reminderSaveError, user]);

  const setReminder = useCallback(async (name: ReminderPrayer, nextEnabled: boolean) => {
    if (!user || savingPrayer) return false;
    setSavingPrayer(name);
    setError("");
    try {
      if (nextEnabled && pushStatus !== "enabled") {
        const notificationReady = await enableNotifications();
        if (!notificationReady) {
          setError(reminderSaveError);
          return false;
        }
      }
      const client = createClient();
      if (!client) throw new Error("Supabase unavailable");
      const { error: saveError } = await client.from("user_prayer_reminders").upsert({
        user_id: user.id,
        prayer: name,
        enabled: nextEnabled,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: "user_id,prayer" });
      if (saveError) throw saveError;
      setEnabled((current) => {
        const next = new Set(current);
        if (nextEnabled) next.add(name);
        else next.delete(name);
        return next;
      });
      return true;
    } catch {
      setError(reminderSaveError);
      return false;
    } finally {
      setSavingPrayer(null);
    }
  }, [enableNotifications, pushStatus, reminderSaveError, savingPrayer, user]);

  useEffect(() => {
    if (!loaded || !user || handledIntent.current) return;
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("reminder");
    if (!isReminderPrayer(requested)) return;
    handledIntent.current = true;
    const completeIntent = async () => {
      if (!enabled.has(requested)) await setReminder(requested, true);
      url.searchParams.delete("reminder");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    };
    void completeIntent();
  }, [enabled, loaded, setReminder, user]);

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
    void setReminder(name, !enabled.has(name));
  }

  return (
    <section id="prayer-times" aria-labelledby="home-prayer-times-title">
      <div className="mb-3">
        <h2 id="home-prayer-times-title" className="text-lg font-bold text-[var(--home-text)]">{t("prayer.todaysPrayerTimes")}</h2>
        <p className="mt-1 text-[13px] leading-5 text-[var(--home-text-secondary)]">{reminderDescription}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_52px] items-center gap-2 border-y border-[var(--home-divider)] bg-[var(--home-surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--home-text-secondary)] sm:px-4">
        <span>{t("prayer.prayer")}</span>
        <span>{t("prayer.azan")}</span>
        <span>{t("prayer.iqama")}</span>
        <span className="sr-only">{reminderDescription}</span>
      </div>
      <div className="divide-y divide-[var(--home-divider)]">
        {rows.map(({ name, adhan, iqama }) => {
          const isActive = name === activePrayer;
          const canRemind = name !== "sunrise";
          const isEnabled = canRemind && enabled.has(name as ReminderPrayer);
          return (
            <div key={name} className={`border-s-[3px] ${isActive ? "border-s-[var(--home-brand)]" : "border-s-transparent"}`} data-prayer-row={name}>
              <div className="grid min-h-14 grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_52px] items-center gap-2 px-3 py-2.5 sm:px-4">
                <span className={`min-w-0 text-[15px] font-bold ${isActive ? "text-[var(--home-brand-strong)]" : "text-[var(--home-text)]"}`}>{t(`prayer.${name}`)}</span>
                <span className="home-tabular text-[15px] font-bold text-[var(--home-text)]">{formatTime(adhan, timeFormat)}</span>
                <span className="home-tabular text-[15px] font-bold text-[var(--home-text-secondary)]">{iqama ? formatTime(iqama, timeFormat) : "—"}</span>
                {canRemind ? (
                  <button
                    type="button"
                    disabled={!loaded || savingPrayer === name}
                    onClick={() => clickReminder(name as ReminderPrayer)}
                    aria-pressed={isEnabled}
                    aria-label={`${t(`prayer.${name}`)}: ${isEnabled ? reminderOn : reminderOff}`}
                    className={`grid h-11 w-11 place-items-center rounded-[10px] transition-colors disabled:text-[var(--home-disabled)] disabled:opacity-60 ${isEnabled ? "bg-[var(--home-brand-soft)] text-[var(--home-brand-strong)]" : "bg-transparent text-[var(--home-brand)] hover:bg-[var(--home-brand-soft)]"}`}
                  >
                    <Bell className={`h-5 w-5 ${isEnabled ? "fill-current" : ""}`} aria-hidden="true" />
                  </button>
                ) : <span aria-label={t("prayer.sunrise")} className="text-center text-[var(--home-text-secondary)]">—</span>}
              </div>
              {name === "maghrib" && prayer.maghribProgram?.enabled ? (
                <div className="mb-3 ms-4 border-s border-[var(--home-divider)] ps-3 text-[var(--home-text-secondary)]" data-testid="maghrib-program">
                  {prayer.maghribProgram.lessonTitle ? (
                    <p className="py-2 text-[13px] leading-5">
                      <span className="font-bold text-[var(--home-brand-strong)]">{t("prayer.khatira")}: </span>
                      {prayer.maghribProgram.lessonTitle}{prayer.maghribProgram.lessonDurationMinutes ? ` · ${prayer.maghribProgram.lessonDurationMinutes} ${t("prayer.minutes")}` : ""}
                    </p>
                  ) : null}
                  {prayer.maghribProgram.combinedIshaTime ? (
                    <p className="flex items-center justify-between gap-3 border-t border-[var(--home-divider)] py-2 text-[13px] leading-5">
                      <span className="font-bold text-[var(--home-brand-strong)]">{t("phase1.combinedIsha")}</span>
                      <span className="home-tabular font-bold text-[var(--home-text)]">{formatTime(prayer.maghribProgram.combinedIshaTime, timeFormat)}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}
    </section>
  );
}
