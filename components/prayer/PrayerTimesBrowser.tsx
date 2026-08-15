"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { addDaysIso, addMonthsIso, formatDateRange, monthBoundsIso, startOfWeekIso, todayIso } from "@/lib/date-utils";
import { getPrayerForDate } from "@/lib/prayer-utils";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { Card } from "@/components/ui/Card";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { WeeklyPrayerTable } from "./WeeklyPrayerTable";
import { PrayerTimesCard } from "./PrayerTimesCard";
import { useTranslation } from "@/lib/i18n/use-translation";

type RangeTab = "today" | "week" | "month";

export function PrayerTimesBrowser() {
  const { t, locale } = useTranslation();
  const today = todayIso();
  const startDate = addDaysIso(today, -30);
  const endDate = addDaysIso(today, 90);
  const { data: prayerTimes, error, loading, reload } = useAsyncData(
    () => getPrayerTimes(false, startDate, endDate)
  );
  const [tab, setTab] = useState<RangeTab>("week");
  const [cursor, setCursor] = useState(today);
  const actualToday = today;
  const effectivePrayerTimes = prayerTimes || [];

  const tabs = useMemo(
    () => [
      { value: "today", label: t("times.today") },
      { value: "week", label: t("times.week") },
      { value: "month", label: t("times.month") },
    ],
    [t]
  );

  const range = useMemo(() => {
    if (tab === "today") return { start: cursor, end: cursor };
    if (tab === "week") {
      const start = startOfWeekIso(cursor);
      return { start, end: addDaysIso(start, 6) };
    }
    return monthBoundsIso(cursor);
  }, [cursor, tab]);

  const visibleTimes = useMemo(
    () => effectivePrayerTimes.filter((item) => item.date >= range.start && item.date <= range.end),
    [effectivePrayerTimes, range]
  );

  function moveRange(direction: -1 | 1) {
    setCursor((current) => {
      if (tab === "today") return addDaysIso(current, direction);
      if (tab === "week") return addDaysIso(current, direction * 7);
      return addMonthsIso(current, direction);
    });
  }

  if (loading) return <DataLoading />;
  if (error) return <DataError message={error} retry={reload} />;

  const selected = getPrayerForDate(effectivePrayerTimes, cursor);

  return (
    <div className="grid gap-5">
      <SegmentedControl options={tabs} value={tab} onChange={(value) => setTab(value as RangeTab)} />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-emerald)]">
          <MapPin className="h-5 w-5 text-[var(--color-gold-dark)]" />
          {t("times.location")}
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <button type="button" onClick={() => moveRange(-1)} aria-label={t("times.previousRange")} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <CalendarDays className="h-4 w-4" />
          <span>{formatDateRange(range.start, range.end, locale)}</span>
          <button type="button" onClick={() => moveRange(1)} aria-label={t("times.nextRange")} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
      {tab === "today" && selected ? <PrayerTimesCard prayer={selected} /> : null}
      {tab !== "today" && visibleTimes.length ? <WeeklyPrayerTable times={visibleTimes} selectedDate={actualToday} /> : null}
      {(tab === "today" ? !selected : visibleTimes.length === 0) ? <EmptyState message={t("prayer.notPublished")} /> : null}
      <p className="rounded-2xl bg-[var(--color-emerald-soft)] p-4 text-center text-sm font-bold text-[var(--color-emerald)]">
        {t("prayer.publishedBy")}
      </p>
    </div>
  );
}
