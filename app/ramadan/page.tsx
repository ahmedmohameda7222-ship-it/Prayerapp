"use client";

import { Moon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ramadanDays } from "@/lib/mock-data";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";

export default function RamadanPage() {
  const { t, locale } = useTranslation();
  const day = ramadanDays[0];
  const note = getLocalizedField(day, "note", locale);
  const rows = [
    [t("ramadan.imsak"), day.imsak],
    [t("ramadan.fajr"), day.fajr],
    [t("ramadan.iftarMaghrib"), day.iftar],
    [t("ramadan.taraweeh"), day.taraweeh],
  ];

  return (
    <AppShell>
      <PageHeader titleKey="ramadan.title" />
      <div className="grid gap-5">
        <Card className="patterned bg-gradient-to-br from-[var(--color-emerald-dark)] to-[var(--color-emerald)] text-[var(--color-card)]">
          <div className="relative z-10 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-emerald-dark)]">
              <Moon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-brand text-3xl">{t("ramadan.schedule")}</h2>
              <p className="text-white/76">{note || t("ramadan.placeholder")}</p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {rows.map(([label, value]) => (
            <Card key={label}>
              <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-[var(--color-emerald)]"><FormattedTime time={value} /></p>
            </Card>
          ))}
        </div>
        <section>
          <SectionTitle>{t("ramadan.announcements")}</SectionTitle>
          <Card><p className="text-sm text-[var(--color-muted)]">{t("ramadan.announcementsPlaceholder")}</p></Card>
        </section>
        <section>
          <SectionTitle>{t("ramadan.calendarPlaceholder")}</SectionTitle>
          <Card><p className="text-sm text-[var(--color-muted)]">{t("ramadan.calendarPlaceholderDesc")}</p></Card>
        </section>
      </div>
    </AppShell>
  );
}
