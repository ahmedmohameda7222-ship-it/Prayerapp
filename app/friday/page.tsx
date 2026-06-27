import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroCard } from "@/components/ui/HeroCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { JumuahCard } from "@/components/friday/JumuahCard";
import { getAnnouncements } from "@/lib/data/announcements";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { getServerLocale, getTranslation } from "@/lib/i18n/server-translation";
import { todayIso } from "@/lib/date-utils";
import { FormattedTime } from "@/components/ui/FormattedTime";

export default async function FridayPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation(locale);
  const [jumuahTimes, announcements] = await Promise.all([
    getJumuahTimes(),
    getAnnouncements(),
  ]);

  const today = todayIso();
  const upcomingJumuah = jumuahTimes.filter((item) => item.date >= today);
  const fridays = upcomingJumuah.length > 0 ? upcomingJumuah : jumuahTimes;
  const firstFriday = fridays[0];

  if (!firstFriday) {
    return (
      <AppShell>
        <PageHeader titleKey="friday.title" />
        <EmptyState message={t("friday.empty")} />
      </AppShell>
    );
  }

  const firstLocation = getLocalizedField(firstFriday, "locationName", locale) || firstFriday.locationName;

  return (
    <AppShell>
      <PageHeader titleKey="friday.title" />
      <div className="grid gap-5">
        <HeroCard
          src="/assets/hero-friday-mosque-night.png"
          desktopSrc="/assets/hero-friday-mosque-night-desktop.png"
          alt={t("friday.heroAlt")}
        >
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
