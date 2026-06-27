"use client";

import { memo } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { JumuahTime } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";

export const JumuahTable = memo(function JumuahTable({
  items,
  disabled,
  locale,
  onEdit,
  onTogglePublish,
  onDelete,
}: {
  items: JumuahTime[];
  disabled: boolean;
  locale: Locale;
  onEdit: (item: JumuahTime) => void;
  onTogglePublish: (id: string, published: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const headers = [
    "admin.date",
    "prayer.khutbah",
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
          {items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-3">{item.date}</td>
              <td className="px-3 py-3">{item.khutbahTime}</td>
              <td className="px-3 py-3">{item.prayerTime}</td>
              <td className="px-3 py-3">{item.locationName}</td>
              <td className="px-3 py-3">{item.khateebName}</td>
              <td className="px-3 py-3">{getLocalizedField(item, "language", locale)}</td>
              <td className="px-3 py-3">{item.published ? t("common.yes") : t("common.no")}</td>
              <td className="px-3 py-3">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(item)} disabled={disabled} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => onTogglePublish(item.id, item.published)} disabled={disabled} aria-label={item.published ? t("admin.unpublish") : t("admin.publish")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">{item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  <button onClick={() => onDelete(item.id)} disabled={disabled} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
