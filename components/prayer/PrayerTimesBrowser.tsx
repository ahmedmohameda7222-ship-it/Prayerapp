"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { prayerTimes } from "@/lib/mock-data";
import { todayIso } from "@/lib/date-utils";
import { getPrayerForDate } from "@/lib/prayer-utils";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { WeeklyPrayerTable } from "./WeeklyPrayerTable";
import { PrayerTimesCard } from "./PrayerTimesCard";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PrayerTimesBrowser() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("week");
  const selectedDate = todayIso();
  const today = getPrayerForDate(prayerTimes, selectedDate);
  const tabs = [
    { value: "today", label: t("times.today") },
    { value: "week", label: t("times.week") },
    { value: "month", label: t("times.month") },
  ];

  return (
    <div className="grid gap-5">
      <SegmentedControl options={tabs} value={tab} onChange={setTab} />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-emerald)]">
          <MapPin className="h-5 w-5 text-[var(--color-gold-dark)]" />
          {t("times.location")}
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <button aria-label={t("times.previousRange")} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <CalendarDays className="h-4 w-4" />
          {t("times.currentWeekRange")}
          <button aria-label={t("times.nextRange")} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
      {tab === "today" ? <PrayerTimesCard prayer={today} /> : null}
      {tab !== "today" && prayerTimes.length ? <WeeklyPrayerTable times={prayerTimes} selectedDate={selectedDate} /> : null}
      {!today ? <EmptyState message={t("prayer.notPublished")} /> : null}
      <p className="rounded-2xl bg-[var(--color-emerald-soft)] p-4 text-center text-sm font-bold text-[var(--color-emerald)]">
        {t("prayer.publishedBy")}
      </p>
    </div>
  );
}
