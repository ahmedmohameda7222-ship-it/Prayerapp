"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";

export function TasbeehCounter({ name = "Subhan Allah", target = 33 }: { name?: string; target?: number }) {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const progress = Math.min(100, (count / target) * 100);
  return (
    <section className="card p-5 text-center" aria-label={t("azkar.tasbeeh")}>
      <p className="text-sm font-bold text-[var(--color-muted)]">{name}</p>
      <p className="font-brand my-3 text-6xl font-semibold text-[var(--color-emerald)]" aria-live="polite">{count}</p>
      <p className="text-sm text-[var(--color-muted)]">{t("azkar.target")} {target}</p>
      <div className="my-4 h-2 rounded-full bg-[var(--color-border)]">
        <div className="h-2 rounded-full bg-[var(--color-gold)]" style={{ width: `${progress}%` }} aria-hidden="true" />
      </div>
      <div className="grid grid-cols-[1fr_52px] gap-3">
        <Button onClick={() => setCount((value) => value + 1)} variant="primary">{t("azkar.increment")}</Button>
        <button onClick={() => setCount(0)} aria-label={t("azkar.reset")} className="grid h-11 place-items-center rounded-[14px] border border-[var(--color-border)] text-[var(--color-emerald)]">
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
