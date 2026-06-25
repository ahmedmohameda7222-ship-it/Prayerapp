"use client";

import { useTranslation } from "@/lib/i18n/use-translation";

export function FormField({ label, value = "", type = "text" }: { label: string; value?: string | number; type?: string }) {
  const { t } = useTranslation();

  return (
    <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
      {label}
      <input
        type={type}
        defaultValue={value}
        className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)]"
      />
      <span className="text-xs font-medium text-[var(--color-muted)]">{t("admin.managedManually")}</span>
    </label>
  );
}
