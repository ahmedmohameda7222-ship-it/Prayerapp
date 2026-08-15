"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { addDaysIso, addMonthsIso, formatDateRange, monthBoundsIso, startOfWeekIso, todayIso } from "@/lib/date-utils";
import { getPrayerForDate } from "@/lib/prayer-utils";
import { useAsyncData } from "@/lib/hooks/use-async-data";
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
  const [tab, setTab] = useState<RangeTab>("week");
  const [cursor, setCursor] = useState(today);

  const range = useMemo(() => {
    if (tab === "today") return { start: cursor, end: cursor };
    if (tab === "week") {
      const start = startOfWeekIso(cursor);
      return { start, end: addDaysIso(start, 6) };
    }
    return monthBoundsIso(cursor);
  }, [cursor, tab]);

  const rangeKey = `${range.start}:${range.end}`;
  const { data: prayerTimes, error, loading, reload } = useAsyncData(
    () => getPrayerTimes(false, range.start, range.end),
    rangeKey,
  );
  const effectivePrayerTimes = prayerTimes || [];

  const tabs = useMemo(
    () => [
      { value: "today", label: t("times.today") },
      { value: "week", label: t("times.week") },
      { value: "month", label: t("times.month") },
    ],
    [t]
  );

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
    <div className="prayer-browser">
      <div className="prayer-range-control">
        <SegmentedControl options={tabs} value={tab} onChange={(value) => setTab(value as RangeTab)} />
      </div>

      <section className="prayer-range-meta" aria-label={t("times.location")}>
        <div className="prayer-range-location">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <span>{t("times.location")}</span>
        </div>
        <div className="prayer-range-nav">
          <button type="button" onClick={() => moveRange(-1)} aria-label={t("times.previousRange")}>
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <div className="prayer-range-label">
            <CalendarDays className="me-1 inline h-4 w-4" aria-hidden="true" />
            <span>{formatDateRange(range.start, range.end, locale)}</span>
          </div>
          <button type="button" onClick={() => moveRange(1)} aria-label={t("times.nextRange")}>
            <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </section>

      {tab === "today" && selected ? <PrayerTimesCard prayer={selected} /> : null}
      {tab !== "today" && visibleTimes.length ? <WeeklyPrayerTable times={visibleTimes} selectedDate={today} /> : null}
      {(tab === "today" ? !selected : visibleTimes.length === 0) ? <EmptyState message={t("prayer.notPublished")} /> : null}

      <p className="rounded-[14px] bg-[var(--app-brand-soft)] p-3 text-center text-xs font-semibold text-[var(--app-brand-strong)]">
        {t("prayer.publishedBy")}
      </p>
    </div>
  );
}
