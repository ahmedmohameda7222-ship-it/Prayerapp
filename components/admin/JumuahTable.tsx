"use client";

import { memo } from "react";
import { AlertTriangle, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { JumuahTime } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";

const LEGACY_WARNING: Record<Locale, string> = {
  ar: "موعد قديم غير صالح: يجب أن يكون بعد الصلاة الرئيسية. صححه يدويًا.",
  en: "Invalid legacy time: it must be after Primary. Correct it manually.",
  de: "Ungültige Altzeit: Sie muss nach dem Hauptgebet liegen. Bitte manuell korrigieren.",
  tr: "Geçersiz eski saat: Ana namazdan sonra olmalıdır. Manuel olarak düzeltin.",
};

export const JumuahTable = memo(function JumuahTable({
  items,
  primaryTime,
  disabled,
  locale,
  onEdit,
  onCorrectLegacy,
  onTogglePublish,
  onDelete,
}: {
  items: JumuahTime[];
  primaryTime: string;
  disabled: boolean;
  locale: Locale;
  onEdit: (item: JumuahTime) => void;
  onCorrectLegacy: (item: JumuahTime) => void;
  onTogglePublish: (id: string, published: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const headers = [
    "admin.date",
    "prayer.prayer",
    "friday.location",
    "friday.khateeb",
    "friday.language",
    "admin.published",
    "admin.actions",
  ];

  return (
    <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
          <tr>{headers.map((key) => <th key={key} className="px-3 py-3">{t(key)}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const legacyInvalid = Boolean(primaryTime && item.prayerTime <= primaryTime);
            return (
              <tr
                key={item.id}
                className={`border-t border-[var(--color-border)] ${legacyInvalid ? "bg-amber-50" : ""}`}
                data-legacy-invalid={legacyInvalid ? "true" : undefined}
              >
                <td className="px-3 py-3">{item.date}</td>
                <td className="px-3 py-3">
                  <div dir="ltr" className="font-bold">{item.prayerTime}</div>
                  {legacyInvalid ? (
                    <p className="mt-1 flex max-w-[280px] items-start gap-1.5 text-xs font-semibold leading-4 text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{LEGACY_WARNING[locale]}</span>
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3">{item.locationName}</td>
                <td className="px-3 py-3">{item.khateebName}</td>
                <td className="px-3 py-3">{getLocalizedField(item, "language", locale)}</td>
                <td className="px-3 py-3">{item.published ? t("common.yes") : t("common.no")}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    {legacyInvalid ? (
                      <button
                        onClick={() => onCorrectLegacy(item)}
                        disabled={disabled}
                        aria-label={LEGACY_WARNING[locale]}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800"
                      >
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                    <button onClick={() => onEdit(item)} disabled={disabled} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                    <button onClick={() => onTogglePublish(item.id, item.published)} disabled={disabled} aria-label={item.published ? t("admin.unpublish") : t("admin.publish")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">{item.published ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button>
                    <button onClick={() => onDelete(item.id)} disabled={disabled} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
