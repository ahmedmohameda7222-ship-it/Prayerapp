"use client";

import { memo } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { PrayerTime } from "@/lib/types";

const tableHeaders = [
  "admin.date", "prayer.fajr", "prayer.sunrise", "prayer.dhuhr", "prayer.asr", "prayer.maghrib", "prayer.isha",
  "prayer.salatFajr", "admin.dhuhrIqama", "admin.asrIqama", "prayer.salatMaghrib", "admin.ishaIqama",
  "admin.maghribProgram", "admin.lessonTitle", "admin.lessonDurationMinutes", "admin.combinedSalatIsha",
  "admin.note", "admin.published", "admin.actions",
];

export const PrayerTimesTable = memo(function PrayerTimesTable({
  items,
  disabled,
  onEdit,
  onTogglePublish,
  onDelete,
}: {
  items: PrayerTime[];
  disabled: boolean;
  onEdit: (item: PrayerTime) => void;
  onTogglePublish: (id: string, published: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
          <tr>{tableHeaders.map((key) => <th key={key} className="px-3 py-3">{t(key)}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-3">{item.date}</td>
              <td className="px-3 py-3">{item.fajr}</td>
              <td className="px-3 py-3">{item.sunrise}</td>
              <td className="px-3 py-3">{item.dhuhr}</td>
              <td className="px-3 py-3">{item.asr}</td>
              <td className="px-3 py-3">{item.maghrib}</td>
              <td className="px-3 py-3">{item.isha}</td>
              <td className="px-3 py-3">{item.fajrIqama || "-"}</td>
              <td className="px-3 py-3">{item.dhuhrIqama || "-"}</td>
              <td className="px-3 py-3">{item.asrIqama || "-"}</td>
              <td className="px-3 py-3">{item.maghribIqama || "-"}</td>
              <td className="px-3 py-3">{item.ishaIqama || "-"}</td>
              <td className="px-3 py-3">{item.maghribProgram?.enabled ? t("common.yes") : t("common.no")}</td>
              <td className="px-3 py-3">{item.maghribProgram?.lessonTitle || "-"}</td>
              <td className="px-3 py-3">{item.maghribProgram?.lessonDurationMinutes || "-"}</td>
              <td className="px-3 py-3">{item.maghribProgram?.combinedIshaTime || "-"}</td>
              <td className="px-3 py-3">{item.note || "-"}</td>
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
