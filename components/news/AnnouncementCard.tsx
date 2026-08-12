"use client";

import Link from "next/link";
import { Bell, ChevronRight, HandHeart, MapPin, Moon, Newspaper, Users } from "lucide-react";
import type { Announcement } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
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
  const Icon = iconMap[announcement.type];
  const title = getLocalizedField(announcement, "title", locale);
  const message = getLocalizedField(announcement, "message", locale);

  if (home) {
    return (
      <Link href="/news" aria-label={title} className="block px-4 py-4 transition-colors hover:bg-white/35 active:bg-white/45">
        <article>
          <h3 className="font-bold text-[var(--home-text)]">{title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--home-text-secondary)]">{message}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--home-text-secondary)]">
            {t(`announcementTypes.${announcement.type}`)} | {formatShortDate(announcement.createdAt.slice(0, 10), locale)}
          </p>
        </article>
      </Link>
    );
  }

  const content = (
    <article className={`card flex gap-3 p-4 ${announcement.isUrgent ? "border-s-4 border-s-[var(--color-gold)] bg-[#fff9e8]" : ""}`}>
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${announcement.isUrgent ? "bg-[var(--color-gold)] text-[var(--color-emerald-dark)]" : "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[var(--color-charcoal)]">{title}</h3>
          {announcement.isUrgent ? <Badge tone="gold">{t("admin.urgent")}</Badge> : null}
        </div>
        <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-muted)]">{message}</p>
        <p className="mt-2 text-xs font-bold text-[var(--color-gold-dark)]">
          {t(`announcementTypes.${announcement.type}`)} | {announcement.createdAt.slice(0, 10)}
        </p>
      </div>
      <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-[var(--color-muted)] rtl:rotate-180" aria-hidden="true" />
    </article>
  );

  return content;
}
