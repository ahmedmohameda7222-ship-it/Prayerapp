"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { createClient } from "@/lib/supabase/client";
import { phase1Copy } from "@/lib/i18n/phase1-copy";
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
  const { t, locale } = useTranslation();
  const copy = phase1Copy[locale];
  const { timeFormat } = useTimeFormat();
  const { user } = usePublicAuth();
  const { pushStatus, enableNotifications } = useAppPreferences();
  const [enabled, setEnabled] = useState<Set<ReminderPrayer>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [savingPrayer, setSavingPrayer] = useState<ReminderPrayer | null>(null);
  const [error, setError] = useState("");
  const handledIntent = useRef(false);

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
        setError(copy.reminderSaveError);
        setLoaded(true);
        return;
      }
      const { data, error: queryError } = await client
        .from("user_prayer_reminders")
        .select("prayer, enabled")
        .eq("user_id", user.id);
      if (!active) return;
      if (queryError) {
        setError(copy.reminderSaveError);
        setEnabled(new Set());
      } else {
        const reminderRows = (data || []) as ReminderRow[];
        setEnabled(new Set(reminderRows.filter((row) => row.enabled && isReminderPrayer(row.prayer)).map((row) => row.prayer as ReminderPrayer)));
      }
      setLoaded(true);
    };
    void load();
    return () => { active = false; };
  }, [copy.reminderSaveError, user]);

  const setReminder = useCallback(async (name: ReminderPrayer, nextEnabled: boolean) => {
    if (!user || savingPrayer) return false;
    setSavingPrayer(name);
    setError("");
    try {
      if (nextEnabled && pushStatus !== "enabled") {
        const notificationReady = await enableNotifications();
        if (!notificationReady) {
          setError(copy.reminderSaveError);
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
      setError(copy.reminderSaveError);
      return false;
    } finally {
      setSavingPrayer(null);
    }
  }, [copy.reminderSaveError, enableNotifications, pushStatus, savingPrayer, user]);

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
      : name === "isha"
        ? prayer.maghribProgram?.combinedIshaTime || getIqama(prayer, name)
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
    <section id="prayer-times" className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]" aria-labelledby="home-prayer-times-title">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 id="home-prayer-times-title" className="font-bold text-[var(--color-emerald)]">{t("prayer.todaysPrayerTimes")}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">{copy.reminderDescription}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_52px] items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--color-muted)] sm:px-4 sm:text-xs">
        <span>{t("prayer.prayer")}</span>
        <span>{t("prayer.azan")}</span>
        <span>{t("prayer.iqama")}</span>
        <span className="sr-only">{copy.reminderDescription}</span>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map(({ name, adhan, iqama }) => {
          const isActive = name === activePrayer;
          const canRemind = name !== "sunrise";
          const isEnabled = canRemind && enabled.has(name as ReminderPrayer);
          return (
            <div key={name} className={isActive ? "bg-[var(--color-emerald-soft)]/60" : ""}>
              <div className="grid min-h-14 grid-cols-[minmax(0,1.15fr)_0.8fr_0.8fr_52px] items-center gap-2 px-3 py-2 sm:px-4">
                <span className={`min-w-0 font-bold ${isActive ? "text-[var(--color-emerald)]" : "text-[var(--color-charcoal)]"}`}>{t(`prayer.${name}`)}</span>
                <span className="font-extrabold text-[var(--color-charcoal)]">{formatTime(adhan, timeFormat)}</span>
                <span className="text-sm font-bold text-[var(--color-muted)]">{iqama ? formatTime(iqama, timeFormat) : "—"}</span>
                {canRemind ? (
                  <button
                    type="button"
                    disabled={!loaded || savingPrayer === name}
                    onClick={() => clickReminder(name as ReminderPrayer)}
                    aria-pressed={isEnabled}
                    aria-label={`${t(`prayer.${name}`)}: ${isEnabled ? copy.reminderOn : copy.reminderOff}`}
                    className={`grid h-11 w-11 place-items-center rounded-full border transition disabled:opacity-50 ${isEnabled ? "border-[var(--color-emerald)] bg-[var(--color-emerald)] text-white" : "border-[var(--color-border)] bg-transparent text-[var(--color-emerald)]"}`}
                  >
                    <Bell className={`h-5 w-5 ${isEnabled ? "fill-current" : ""}`} aria-hidden="true" />
                  </button>
                ) : <span aria-label={t("prayer.sunrise")} className="text-center text-[var(--color-muted)]">—</span>}
              </div>
              {name === "maghrib" && prayer.maghribProgram?.enabled && prayer.maghribProgram.lessonTitle ? (
                <p className="px-3 pb-2 text-xs leading-5 text-[var(--color-muted)] sm:px-4">
                  {prayer.maghribProgram.lessonTitle}{prayer.maghribProgram.lessonDurationMinutes ? ` · ${prayer.maghribProgram.lessonDurationMinutes} ${t("prayer.minutes")}` : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}
    </section>
  );
}
