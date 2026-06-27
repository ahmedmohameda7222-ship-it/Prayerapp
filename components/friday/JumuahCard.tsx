"use client";

import { Clock, Languages, MapPin, Mic2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FormattedTime } from "@/components/ui/FormattedTime";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { JumuahTime } from "@/lib/types";

export function JumuahCard({ jumuah, index }: { jumuah: JumuahTime; index: number }) {
  const { t } = useTranslation();

  const details: [React.ElementType, string, string, boolean][] = [
    [Clock, t("friday.khutbahTime"), jumuah.khutbahTime, true],
    [Clock, t("friday.jumuahPrayer"), jumuah.prayerTime, true],
  ];
  if (jumuah.locationName) details.push([MapPin, t("friday.location"), jumuah.locationName, false]);
  if (jumuah.khateebName) details.push([Mic2, t("friday.khateeb"), jumuah.khateebName, false]);
  if (jumuah.language) details.push([Languages, t("friday.language"), jumuah.language, false]);

  return (
    <Card>
      <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">
        {t("friday.jumuahPrayer")} {index > 0 ? `#${index + 1}` : ""}
      </h3>
      <div className="grid gap-3">
        {details.map(([Icon, label, value, isTime]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-gold-soft)] text-[var(--color-gold-dark)]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
              <p className="font-bold text-[var(--color-charcoal)]">{isTime ? <FormattedTime time={value} /> : value}</p>
            </div>
          </div>
        ))}
        {jumuah.notes ? <p className="rounded-2xl bg-[var(--color-emerald-soft)] p-3 text-sm font-bold text-[var(--color-emerald)]">{jumuah.notes}</p> : null}
      </div>
    </Card>
  );
}
