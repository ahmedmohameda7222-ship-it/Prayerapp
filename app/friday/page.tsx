"use client";

import { Clock, Languages, MapPin, Mic2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroCard } from "@/components/ui/HeroCard";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { announcements, jumuahTimes } from "@/lib/mock-data";
import { FormattedTime } from "@/components/ui/FormattedTime";

export default function FridayPage() {
  const friday = jumuahTimes[0];
  const details = [
    [Clock, "Khutbah Time", friday.khutbahTime],
    [Clock, "Jumu'ah Prayer", friday.prayerTime],
    [MapPin, "Location", friday.locationName],
    [Mic2, "Khateeb", friday.khateebName],
    [Languages, "Language", friday.language],
  ] as const;

  return (
    <AppShell>
      <PageHeader title="Jumu'ah" />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-friday-mosque-night.png" alt="Friday mosque illustration" priority>
          <h2 className="font-brand text-5xl font-semibold">Jumu&apos;ah</h2>
          <p className="mt-3 text-lg font-bold text-[var(--color-gold)]">Khutbah <FormattedTime time={friday.khutbahTime} /> · Prayer <FormattedTime time={friday.prayerTime} /></p>
          <p className="mt-2 text-sm text-white/82">{friday.locationName}</p>
        </HeroCard>
        <Card>
          <div className="grid gap-3">
            {details.map(([Icon, label, value]) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-dark)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
                  <p className="font-bold text-[var(--color-charcoal)]">{label.includes("Time") ? <FormattedTime time={value} /> : value}</p>
                </div>
              </div>
            ))}
            <p className="rounded-2xl bg-[var(--color-emerald-soft)] p-3 text-sm font-bold text-[var(--color-emerald)]">{friday.notes}</p>
          </div>
        </Card>
        <section>
          <SectionTitle>Announcements</SectionTitle>
          <div className="grid gap-3">
            {announcements.slice(0, 3).map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} />)}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
