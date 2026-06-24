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

export function PrayerTimesBrowser() {
  const [tab, setTab] = useState("Week");
  const selectedDate = todayIso();
  const today = getPrayerForDate(prayerTimes, selectedDate);

  return (
    <div className="grid gap-5">
      <SegmentedControl options={["Today", "Week", "Month"]} value={tab} onChange={setTab} />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-emerald)]">
          <MapPin className="h-5 w-5 text-[var(--color-gold-dark)]" />
          Deggendorf
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <button aria-label="Previous date range" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <CalendarDays className="h-4 w-4" />
          22-28 Jun 2026
          <button aria-label="Next date range" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
      {tab === "Today" ? <PrayerTimesCard prayer={today} /> : null}
      {tab !== "Today" && prayerTimes.length ? <WeeklyPrayerTable times={prayerTimes} selectedDate={selectedDate} /> : null}
      {!today ? <EmptyState message="Prayer times for this date have not been published yet." /> : null}
      <p className="rounded-2xl bg-[var(--color-emerald-soft)] p-4 text-center text-sm font-bold text-[var(--color-emerald)]">
        Times are published by the mosque administration for Deggendorf.
      </p>
    </div>
  );
}
