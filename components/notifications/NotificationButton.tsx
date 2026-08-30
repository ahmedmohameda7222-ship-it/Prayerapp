"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import { getAnnouncements } from "@/lib/data/announcements";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";

export function NotificationButton({ inverted = false, home = false }: { inverted?: boolean; home?: boolean }) {
  const { t, locale } = useTranslation();
  const { data } = useAsyncData(getAnnouncements);
  const [open, setOpen] = useState(false);
  const items = (data || []).filter((item) => item.isUrgent).slice(0, 5);
  const triggerClass = home
    ? "rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
    : inverted
      ? "rounded-full bg-white/10 text-white"
      : "rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)] shadow-[var(--shadow-soft)]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t("common.notifications")}
        className={`relative grid h-11 w-11 place-items-center ${triggerClass}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          data-supericon="tabler:bell"
          aria-hidden="true"
        >
          <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
        {items.length ? (
          <span className={`absolute end-1 top-1 h-2.5 w-2.5 rounded-full bg-[var(--color-danger)] ring-2 ${home ? "ring-[var(--home-brand)]" : "ring-[var(--color-card)]"}`} />
        ) : null}
      </button>
      {open ? (
        <div className={`absolute end-0 top-14 z-50 w-[min(320px,calc(100vw-32px))] border p-3 text-start ${home ? "rounded-xl border-[var(--home-divider)] bg-white text-[var(--home-text)] shadow-[0_10px_24px_rgba(17,24,22,0.14)]" : "rounded-2xl border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-charcoal)] shadow-[var(--shadow-card)]"}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className={home ? "font-bold text-[var(--home-brand-strong)]" : "font-bold text-[var(--color-emerald)]"}>{t("common.notifications")}</p>
            <button type="button" className={home ? "grid h-11 w-11 place-items-center rounded-lg" : ""} onClick={() => setOpen(false)} aria-label={t("common.close")}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {items.length ? (
            <div className={home ? "divide-y divide-[var(--home-divider)]" : "grid gap-2"}>
              {items.map((item) => (
                <Link
                  onClick={() => setOpen(false)}
                  href="/news"
                  key={item.id}
                  className={home ? "block py-3 text-sm font-semibold" : "rounded-xl bg-[var(--color-cream)] p-3 text-sm font-bold"}
                >
                  {getLocalizedField(item, "title", locale)}
                </Link>
              ))}
            </div>
          ) : (
            <p className={home ? "text-sm text-[var(--home-text-secondary)]" : "text-sm text-[var(--color-muted)]"}>{t("notifications.empty")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
