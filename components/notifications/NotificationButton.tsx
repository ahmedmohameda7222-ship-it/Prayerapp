"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, X } from "lucide-react";
import { getAnnouncements } from "@/lib/data/announcements";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";

export function NotificationButton({ inverted = false }: { inverted?: boolean }) {
  const { t, locale } = useTranslation();
  const { data } = useAsyncData(getAnnouncements);
  const [open, setOpen] = useState(false);
  const items = (data || []).filter((item) => item.isUrgent).slice(0, 5);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={t("common.notifications")} className={`relative grid h-11 w-11 place-items-center rounded-full ${inverted ? "bg-white/10 text-white" : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)] shadow-[var(--shadow-soft)]"}`}>
        <Bell className="h-5 w-5" />
        {items.length ? <span className="absolute end-0 top-0 h-3 w-3 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-card)]" /> : null}
      </button>
      {open ? <div className="absolute end-0 top-14 z-50 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-start text-[var(--color-charcoal)] shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-center justify-between"><p className="font-bold text-[var(--color-emerald)]">{t("common.notifications")}</p><button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")}><X className="h-4 w-4" /></button></div>
        {items.length ? <div className="grid gap-2">{items.map((item) => <Link onClick={() => setOpen(false)} href="/news" key={item.id} className="rounded-xl bg-[var(--color-cream)] p-3 text-sm font-bold">{getLocalizedField(item, "title", locale)}</Link>)}</div> : <p className="text-sm text-[var(--color-muted)]">{t("notifications.empty")}</p>}
      </div> : null}
    </div>
  );
}
