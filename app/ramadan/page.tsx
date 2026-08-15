import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { getRamadanDays } from "@/lib/data/ramadan";
import { getAnnouncements } from "@/lib/data/announcements";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { getServerLocale, getTranslation } from "@/lib/i18n/server-translation";
import { formatShortDate, todayIso } from "@/lib/date-utils";

export default async function RamadanPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation(locale);
  const [days, announcements] = await Promise.all([
    getRamadanDays(),
    getAnnouncements(),
  ]);
  const filteredAnnouncements = announcements.filter(
    (item) => item.type === "Ramadan" || item.type === "Eid"
  );
  const today = todayIso();
  const day =
    days.find((item) => item.date === today) ||
    days.find((item) => item.date > today) ||
    days[0];

  return (
    <AppShell>
      <div className="ramadan-screen">
        <PageHeader titleKey="ramadan.title" backHref="/more" />
        {day ? (
          <div className="grid gap-6">
            <section className="ramadan-day-summary">
              <p className="text-sm font-semibold text-white/74">{formatShortDate(day.date, locale)}</p>
              <h2 className="mt-1">{t("ramadan.day", { day: day.ramadanDay })}</h2>
              {getLocalizedField(day, "note", locale) ? (
                <p className="mt-2 text-sm leading-6 text-white/82">{getLocalizedField(day, "note", locale)}</p>
              ) : null}
            </section>

            <section className="ramadan-today-grid" aria-label={t("ramadan.day", { day: day.ramadanDay })}>
              {[
                [t("ramadan.imsak"), day.imsak],
                [t("ramadan.fajr"), day.fajr],
                [t("ramadan.iftarMaghrib"), day.iftar],
                [t("ramadan.taraweeh"), day.taraweeh],
              ].map(([label, value]) => (
                <div key={label} className="ramadan-time-cell">
                  <p className="ramadan-time-label">{label}</p>
                  <p className="ramadan-time-value"><FormattedTime time={value as string} /></p>
                </div>
              ))}
            </section>

            <section>
              <SectionTitle>{t("ramadan.announcements")}</SectionTitle>
              {filteredAnnouncements.length ? (
                <div className="native-feed">
                  {filteredAnnouncements.map((item) => (
                    <AnnouncementCard key={item.id} announcement={item} />
                  ))}
                </div>
              ) : (
                <EmptyState message={t("ramadan.noAnnouncements")} />
              )}
            </section>

            <section>
              <SectionTitle>{t("ramadan.calendar")}</SectionTitle>
              <div className="ramadan-mobile-calendar">
                {days.map((item) => (
                  <article key={item.id} className="ramadan-mobile-day" data-today={item.date === today ? "true" : undefined}>
                    <span>
                      <strong className="block">{item.ramadanDay}</strong>
                      <time className="block text-[10px] text-[var(--app-text-secondary)]" dateTime={item.date}>{formatShortDate(item.date, locale)}</time>
                    </span>
                    <span><FormattedTime time={item.imsak} /></span>
                    <span><FormattedTime time={item.fajr} /></span>
                    <span><FormattedTime time={item.iftar} /></span>
                    <span><FormattedTime time={item.taraweeh} /></span>
                  </article>
                ))}
              </div>

              <div className="ramadan-desktop-calendar overflow-x-auto rounded-[18px] border border-[var(--app-divider)] bg-[var(--app-surface)]">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-[var(--color-emerald)] text-white">
                    <tr>
                      {["ramadan.dayLabel", "admin.date", "ramadan.imsak", "ramadan.fajr", "ramadan.iftarMaghrib", "ramadan.taraweeh"].map((key) => (
                        <th key={key} className="px-3 py-3">{t(key)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((item) => (
                      <tr key={item.id} className={item.date === today ? "bg-[var(--color-emerald-soft)]" : "border-t border-[var(--color-border)]"}>
                        <td className="px-3 py-3 font-bold">{item.ramadanDay}</td>
                        <td className="px-3 py-3">{formatShortDate(item.date, locale)}</td>
                        <td className="px-3 py-3"><FormattedTime time={item.imsak} /></td>
                        <td className="px-3 py-3"><FormattedTime time={item.fajr} /></td>
                        <td className="px-3 py-3"><FormattedTime time={item.iftar} /></td>
                        <td className="px-3 py-3"><FormattedTime time={item.taraweeh} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          <EmptyState message={t("ramadan.noSchedule")} />
        )}
      </div>
    </AppShell>
  );
}
