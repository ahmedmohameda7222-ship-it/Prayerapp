"use client";

import Link from "next/link";
import { Bell, ChevronRight, HandHeart, MapPin, Moon, Newspaper, Users } from "lucide-react";
import type { Announcement } from "@/lib/types";
import { formatShortDate } from "@/lib/date-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";

const iconMap = {
  General: Newspaper,
  Urgent: Bell,
  "Location update": MapPin,
  Community: Users,
  Ramadan: Moon,
  Eid: Moon,
  Donation: HandHeart,
};

export function AnnouncementCard({ announcement, home = false }: { announcement: Announcement; home?: boolean }) {
  const { t, locale } = useTranslation();
  const title = getLocalizedField(announcement, "title", locale);
  const message = getLocalizedField(announcement, "message", locale);

  if (home) {
    return (
      <Link href="/news" aria-label={title} className="block px-4 py-4 transition-colors hover:bg-white/35 active:bg-white/45">
        <article>
          <h3 className="font-bold text-[var(--home-urgent)]">{title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--home-text-secondary)]">{message}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--home-text-secondary)]">
            {t(`announcementTypes.${announcement.type}`)} | {formatShortDate(announcement.createdAt.slice(0, 10), locale)}
          </p>
        </article>
      </Link>
    );
  }

  const Icon = iconMap[announcement.type];

  return (
    <article className="native-feed-item" data-urgent={announcement.isUrgent ? "true" : undefined}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--app-brand-soft)] text-[var(--app-brand)]" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="native-feed-item-title">{title}</h2>
          <p className="native-feed-item-copy whitespace-pre-wrap">{message}</p>
          <p className="native-feed-item-meta">
            {t(`announcementTypes.${announcement.type}`)} · {formatShortDate(announcement.createdAt.slice(0, 10), locale)}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
      </div>
    </article>
  );
}
