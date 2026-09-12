"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { BookOpen, CalendarDays, ChevronRight, Compass, HandHeart, Moon, Settings, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { useTranslation } from "@/lib/i18n/use-translation";
import { MORE_SECTION_LABELS, type MoreSectionId } from "./section-labels";
import styles from "./more.module.css";

type MoreItem = readonly [string, string, ComponentType<{ className?: string }>];

type MoreSection = {
  id: MoreSectionId;
  items: readonly MoreItem[];
};

const sections = [
  {
    id: "worship",
    items: [
      ["/azkar", "azkar.title", BookOpen],
      ["/ramadan", "ramadan.title", Moon],
      ["/qibla", "qibla.title", Compass],
    ],
  },
  {
    id: "community",
    items: [
      ["/events", "events.title", CalendarDays],
      ["/donations", "donations.title", HandHeart],
      ["/mosque", "mosque.title", MosqueIcon],
    ],
  },
  {
    id: "accountApp",
    items: [
      ["/account", "phase1.account", UserRound],
      ["/settings", "settings.title", Settings],
      ["/privacy", "legal.privacyTitle", ShieldCheck],
    ],
  },
] as const satisfies readonly MoreSection[];

export default function MorePage() {
  const { t, locale } = useTranslation();

  return (
    <AppShell>
      <PageHeader titleKey="nav.more" backHref={null} />
      <div className={styles.screen}>
        <div className={styles.sections}>
          {sections.map((section) => {
            const headingId = `more-${section.id}-heading`;

            return (
              <section key={section.id} className={styles.section} aria-labelledby={headingId}>
                <h2 id={headingId} className={styles.sectionTitle}>
                  {MORE_SECTION_LABELS[locale][section.id]}
                </h2>
                <div className={`native-list-group ${styles.list}`} role="list">
                  {section.items.map(([href, labelKey, Icon]) => (
                    <Link key={href} href={href} className={`native-list-row ${styles.row}`} role="listitem">
                      <span className={`native-list-row-icon ${styles.icon}`} aria-hidden="true">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="native-list-row-title">{t(labelKey)}</span>
                      <ChevronRight
                        className={`native-list-row-chevron h-5 w-5 rtl:rotate-180 ${styles.chevron}`}
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
