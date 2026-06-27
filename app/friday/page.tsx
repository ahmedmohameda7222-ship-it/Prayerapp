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
import type { JumuahTime } from "@/lib/types";

function JumuahCard({ jumuah, index }: { jumuah: JumuahTime; index: number }) {
  const { t, locale } = useTranslation();
  const locationName = getLocalizedField(jumuah, "locationName", locale) || jumuah.locationName;
  const language = getLocalizedField(jumuah, "language", locale) || jumuah.language;
  const notes = getLocalizedField(jumuah, "notes", locale) || jumuah.notes;
  const details: [React.ElementType, string, string, boolean][] = [
    [Clock, t("friday.khutbahTime"), jumuah.khutbahTime, true],
    [Clock, t("friday.jumuahPrayer"), jumuah.prayerTime, true],
  ];
  if (locationName) details.push([MapPin, t("friday.location"), locationName, false]);
  if (jumuah.khateebName) details.push([Mic2, t("friday.khateeb"), jumuah.khateebName, false]);
  if (language) details.push([Languages, t("friday.language"), language, false]);

  return (
    <Card>
      <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">
        {t("friday.jumuahPrayer")} {index > 0 ? `#${index + 1}` : ""}
      </h3>
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
        {notes ? <p className="rounded-2xl bg-[var(--color-emerald-soft)] p-3 text-sm font-bold text-[var(--color-emerald)]">{notes}</p> : null}
      </div>
    </Card>
  );
}

export default function FridayPage() {
  const { t, locale } = useTranslation();
  const { data, error, loading, reload } = useAsyncData(loadFridayData);
  const announcements = data?.announcements || [];
  const today = todayIso();
  const upcomingJumuah = (data?.jumuahTimes || []).filter((item) => item.date >= today);
  const fridays = upcomingJumuah.length > 0 ? upcomingJumuah : (data?.jumuahTimes || []);
  const firstFriday = fridays[0];

  if (loading) return <AppShell><PageHeader titleKey="friday.title" /><DataLoading /></AppShell>;
  if (error) return <AppShell><PageHeader titleKey="friday.title" /><DataError message={error} retry={reload} /></AppShell>;
  if (!firstFriday) return <AppShell><PageHeader titleKey="friday.title" /><EmptyState message={t("friday.empty")} /></AppShell>;

  const firstLocation = getLocalizedField(firstFriday, "locationName", locale) || firstFriday.locationName;

  return (
    <AppShell>
      <PageHeader titleKey="friday.title" />
      <div className="grid gap-5">
        <HeroCard src="/assets/hero-friday-mosque-night.png" alt={t("friday.heroAlt")} priority>
          <h2 className="font-brand text-5xl font-semibold">{t("friday.title")}</h2>
          <p className="mt-3 text-lg font-bold text-[var(--color-gold)]">
            {t("prayer.khutbah")} <FormattedTime time={firstFriday.khutbahTime} /> | {t("prayer.prayer")}{" "}
            <FormattedTime time={firstFriday.prayerTime} />
          </p>
          {firstLocation ? <p className="mt-2 text-sm text-white/82">{firstLocation}</p> : null}
        </HeroCard>

        <SectionTitle>{t("friday.title")}</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {fridays.map((jumuah, index) => (
            <JumuahCard key={jumuah.id} jumuah={jumuah} index={index} />
          ))}
        </div>

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
