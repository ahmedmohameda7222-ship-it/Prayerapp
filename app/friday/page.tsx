"use client";

import { Clock, Languages, MapPin, Mic2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroCard } from "@/components/ui/HeroCard";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { getAnnouncements } from "@/lib/data/announcements";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { todayIso } from "@/lib/date-utils";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";

export default function FridayPage() {
  const { t, locale } = useTranslation();
  const { data, error, loading, reload } = useAsyncData(loadFridayData);
  const announcements = data?.announcements || [];
  const friday = (data?.jumuahTimes || []).find((item) => item.date >= todayIso()) || data?.jumuahTimes[0];
  if (loading) return <AppShell><PageHeader titleKey="friday.title" /><DataLoading /></AppShell>;
  if (error) return <AppShell><PageHeader titleKey="friday.title" /><DataError message={error} retry={reload} /></AppShell>;
  if (!friday) return <AppShell><PageHeader titleKey="friday.title" /><EmptyState message={t("friday.empty")} /></AppShell>;
  const locationName = getLocalizedField(friday, "locationName", locale) || friday.locationName;
  const language = getLocalizedField(friday, "language", locale) || friday.language;
  const notes = getLocalizedField(friday, "notes", locale) || friday.notes;
  const details = [
    [Clock, t("friday.khutbahTime"), friday.khutbahTime, true],
    [Clock, t("friday.jumuahPrayer"), friday.prayerTime, true],
    [MapPin, t("friday.location"), locationName, false],
    [Mic2, t("friday.khateeb"), friday.khateebName, false],
    [Languages, t("friday.language"), language, false],
  ] as const;

  return (
    <AppShell>
      <PageHeader titleKey="friday.title" />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-friday-mosque-night.png" alt={t("friday.heroAlt")} priority>
          <h2 className="font-brand text-5xl font-semibold">{t("friday.title")}</h2>
          <p className="mt-3 text-lg font-bold text-[var(--color-gold)]">
            {t("prayer.khutbah")} <FormattedTime time={friday.khutbahTime} /> | {t("prayer.prayer")}{" "}
            <FormattedTime time={friday.prayerTime} />
          </p>
          <p className="mt-2 text-sm text-white/82">{locationName}</p>
        </HeroCard>
        <Card>
          <div className="grid gap-3">
            {details.map(([Icon, label, value, isTime]) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-dark)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
                  <p className="font-bold text-[var(--color-charcoal)]">{isTime ? <FormattedTime time={value} /> : value}</p>
                </div>
              </div>
            ))}
            <p className="rounded-2xl bg-[var(--color-emerald-soft)] p-3 text-sm font-bold text-[var(--color-emerald)]">{notes}</p>
          </div>
        </Card>
        <section>
          <SectionTitle>{t("friday.announcements")}</SectionTitle>
          <div className="grid gap-3">
            {announcements.slice(0, 3).map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

async function loadFridayData() {
  const [jumuahTimes, announcements] = await Promise.all([getJumuahTimes(), getAnnouncements()]);
  return { jumuahTimes, announcements };
}
