import { Moon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
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
      <PageHeader titleKey="ramadan.title" />
      {day ? (
        <div className="grid gap-5">
          <Card className="patterned bg-gradient-to-br from-[var(--color-emerald-dark)] to-[var(--color-emerald)] text-[var(--color-card)]">
            <div className="relative z-10 flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-emerald-dark)]">
                <Moon className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-brand text-3xl">{t("ramadan.day", { day: day.ramadanDay })}</h2>
                <p className="text-white/76">
                  {getLocalizedField(day, "note", locale) || formatShortDate(day.date, locale)}
                </p>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [t("ramadan.imsak"), day.imsak],
              [t("ramadan.fajr"), day.fajr],
              [t("ramadan.iftarMaghrib"), day.iftar],
              [t("ramadan.taraweeh"), day.taraweeh],
            ].map(([label, value]) => (
              <Card key={label}>
                <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--color-emerald)]">
                  <FormattedTime time={value as string} />
                </p>
              </Card>
            ))}
          </div>
          <section>
            <SectionTitle>{t("ramadan.announcements")}</SectionTitle>
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredAnnouncements.length ? (
                filteredAnnouncements.map((item) => (
                  <AnnouncementCard key={item.id} announcement={item} />
                ))
              ) : (
                <EmptyState message={t("ramadan.noAnnouncements")} />
              )}
            </div>
          </section>
          <section>
            <SectionTitle>{t("ramadan.calendar")}</SectionTitle>
            <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)]">
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
                    <tr
                      key={item.id}
                      className={
                        item.date === today
                          ? "bg-[var(--color-emerald-soft)]"
                          : "border-t border-[var(--color-border)]"
                      }
                    >
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
    </AppShell>
  );
}
