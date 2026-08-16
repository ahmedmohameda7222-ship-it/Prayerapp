"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, Compass, HandHeart, Landmark, Moon, Settings, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/lib/i18n/use-translation";

const items = [
  ["/azkar", "azkar.title", BookOpen, false],
  ["/ramadan", "ramadan.title", Moon, false],
  ["/qibla", "qibla.title", Compass, false],
  ["/events", "events.title", CalendarDays, true],
  ["/donations", "donations.title", HandHeart, false],
  ["/mosque", "mosque.title", Landmark, true],
  ["/account", "phase1.account", UserRound, true],
  ["/settings", "settings.title", Settings, false],
] as const;

export default function MorePage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <PageHeader titleKey="nav.more" backHref={null} />
      <div className="native-list-group" role="list">
        {items.map(([href, labelKey, Icon, groupStart]) => (
          <Link
            key={href}
            href={href}
            className="native-list-row"
            data-group-start={groupStart ? "true" : undefined}
            role="listitem"
          >
            <span className="native-list-row-icon" aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            <span className="native-list-row-title">{t(labelKey)}</span>
            <ChevronRight className="native-list-row-chevron h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
