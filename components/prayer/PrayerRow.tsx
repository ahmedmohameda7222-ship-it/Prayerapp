"use client";

import { ChevronRight, Clock, Moon, Sun, Sunrise } from "lucide-react";
import type { PrayerName, PrayerTime } from "@/lib/types";
import { getIqama, prayerLabels } from "@/lib/prayer-utils";
import { useTranslation } from "@/lib/i18n/use-translation";

const icons = {
  fajr: Moon,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: Clock,
  maghrib: Moon,
  isha: Moon,
};

export function PrayerRow({ prayer, name, active = false }: { prayer: PrayerTime; name: PrayerName; active?: boolean }) {
  const { t } = useTranslation();
  const Icon = icons[name];
  const iqama = getIqama(prayer, name);
  return (
    <div className={`grid min-h-14 grid-cols-[42px_1fr_auto_20px] items-center gap-3 rounded-2xl px-3 py-2 ${active ? "bg-[var(--color-emerald-soft)]" : ""}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-full ${active ? "bg-[var(--color-emerald)] text-[var(--color-gold)]" : "bg-[var(--color-cream-deep)] text-[var(--color-emerald)]"}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className={`font-bold ${active ? "text-[var(--color-emerald)]" : "text-[var(--color-charcoal)]"}`}>{prayerLabels[name]}</p>
        {iqama ? <p className="text-xs text-[var(--color-muted)]">{t("prayer.iqama")} {iqama}</p> : <p className="text-xs text-[var(--color-muted)]">{t("prayer.noIqama")}</p>}
      </div>
      <p className={`text-lg font-extrabold ${active ? "text-[var(--color-emerald)]" : "text-[var(--color-charcoal)]"}`}>{prayer[name]}</p>
      <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
    </div>
  );
}
