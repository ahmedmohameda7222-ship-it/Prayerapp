"use client";

import { Moon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ramadanDays } from "@/lib/mock-data";
import { FormattedTime } from "@/components/ui/FormattedTime";

export default function RamadanPage() {
  const day = ramadanDays[0];
  return (
    <AppShell>
      <PageHeader title="Ramadan" />
      <div className="grid gap-5">
        <Card className="patterned bg-gradient-to-br from-[var(--color-emerald-dark)] to-[var(--color-emerald)] text-[var(--color-card)]">
          <div className="relative z-10 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-emerald-dark)]">
              <Moon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-brand text-3xl">Ramadan Schedule</h2>
              <p className="text-white/76">Placeholder calendar for Deggendorf.</p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Imsak", day.imsak],
            ["Fajr", day.fajr],
            ["Iftar / Maghrib", day.iftar],
            ["Taraweeh", day.taraweeh],
          ].map(([label, value]) => (
            <Card key={label}>
              <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--color-emerald)]"><FormattedTime time={value} /></p>
            </Card>
          ))}
        </div>
        <section>
          <SectionTitle>Ramadan Announcements</SectionTitle>
          <Card><p className="text-sm text-[var(--color-muted)]">Ramadan announcements will be published by the mosque administration.</p></Card>
        </section>
        <section>
          <SectionTitle>Calendar Placeholder</SectionTitle>
          <Card><p className="text-sm text-[var(--color-muted)]">Daily Ramadan rows will appear here once the schedule is published.</p></Card>
        </section>
      </div>
    </AppShell>
  );
}
