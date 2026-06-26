"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Eye, EyeOff, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { PrayerTime } from "@/lib/types";
import { parsePrayerTimesCsv } from "@/lib/csv/prayer-import";
import {
  createPrayerTimeAction,
  deletePrayerTimeAction,
  togglePublishPrayerTimeAction,
  updatePrayerTimeAction,
  importPrayerTimesAction,
} from "./actions";

const emptyForm = {
  date: "",
  fajr: "",
  sunrise: "",
  dhuhr: "",
  asr: "",
  maghrib: "",
  isha: "",
  fajrIqama: "",
  dhuhrIqama: "",
  asrIqama: "",
  maghribIqama: "",
  ishaIqama: "",
  note: "",
  published: "true",
};

export default function AdminPrayerTimesPage() {
  const { session } = useAdminAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<PrayerTime[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => { getPrayerTimes(true).then((data) => setItems(data)).catch(() => setError(t("common.dataLoadFailed"))); }, [t]);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
  }

  function fillForm(item: PrayerTime) {
    setForm({
      date: item.date,
      fajr: item.fajr,
      sunrise: item.sunrise,
      dhuhr: item.dhuhr,
      asr: item.asr,
      maghrib: item.maghrib,
      isha: item.isha,
      fajrIqama: item.fajrIqama || "",
      dhuhrIqama: item.dhuhrIqama || "",
      asrIqama: item.asrIqama || "",
      maghribIqama: item.maghribIqama || "",
      ishaIqama: item.ishaIqama || "",
      note: item.note || "",
      published: String(item.published),
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function refreshItems() {
    setItems(await getPrayerTimes(true));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const token = session?.access_token || "";
    if (!token) {
      setError(t("admin.errors.notAuthenticated"));
      return;
    }
    startTransition(async () => {
      const result = editingId ? await updatePrayerTimeAction(token, editingId, form) : await createPrayerTimeAction(token, form);
      if (!result.success) {
        setError(t(result.error || "admin.errors.saveFailed"));
        return;
      }
      resetForm();
      setSuccess(t(editingId ? "admin.messages.updated" : "admin.messages.created"));
      await refreshItems();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin.confirmDeletePrayerTime"))) return;
    setError("");
    const token = session?.access_token || "";
    if (!token) return;
    startTransition(async () => {
      const result = await deletePrayerTimeAction(token, id);
      if (!result.success) setError(t(result.error || "admin.errors.deleteFailed"));
      else {
        setSuccess(t("admin.messages.deleted"));
        await refreshItems();
      }
    });
  }

  async function handleTogglePublish(id: string, current: boolean) {
    setError("");
    const token = session?.access_token || "";
    if (!token) return;
    startTransition(async () => {
      const result = await togglePublishPrayerTimeAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshItems();
    });
  }

  async function handleCsvImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const token = session?.access_token || "";
    if (!file || !token) return;
    setError(""); setSuccess("");
    try {
      const rows = parsePrayerTimesCsv(await file.text());
      startTransition(async () => {
        const result = await importPrayerTimesAction(token, rows);
        if (!result.success) return setError(t(result.error || "admin.errors.invalidCsv"));
        setSuccess(t("admin.messages.csvImported", { count: result.count || rows.length }));
        await refreshItems();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("admin.errors.invalidCsv"));
    } finally {
      event.target.value = "";
    }
  }

  const fields = [
    { key: "date", labelKey: "admin.date", type: "date" },
    { key: "fajr", labelKey: "prayer.fajr", type: "time" },
    { key: "sunrise", labelKey: "prayer.sunrise", type: "time" },
    { key: "dhuhr", labelKey: "prayer.dhuhr", type: "time" },
    { key: "asr", labelKey: "prayer.asr", type: "time" },
    { key: "maghrib", labelKey: "prayer.maghrib", type: "time" },
    { key: "isha", labelKey: "prayer.isha", type: "time" },
    { key: "fajrIqama", labelKey: "admin.fajrIqama", type: "time", optional: true },
    { key: "dhuhrIqama", labelKey: "admin.dhuhrIqama", type: "time", optional: true },
    { key: "asrIqama", labelKey: "admin.asrIqama", type: "time", optional: true },
    { key: "maghribIqama", labelKey: "admin.maghribIqama", type: "time", optional: true },
    { key: "ishaIqama", labelKey: "admin.ishaIqama", type: "time", optional: true },
    { key: "note", labelKey: "admin.note", type: "text", optional: true },
  ];

  const tableHeaders = [
    "admin.date", "prayer.fajr", "prayer.sunrise", "prayer.dhuhr", "prayer.asr", "prayer.maghrib", "prayer.isha",
    "admin.fajrIqama", "admin.dhuhrIqama", "admin.asrIqama", "admin.maghribIqama", "admin.ishaIqama",
    "admin.note", "admin.published", "admin.actions",
  ];

  return (
    <AdminShell titleKey="admin.prayerTimesManagement">
      <div className="grid gap-5">
        <AdminWarningCard message={t("admin.missingNextWeek")} />

        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? t("admin.editPrayerTime") : t("admin.createPrayerTime")}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {fields.map(({ key, labelKey, type, optional }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input type={type} required={!optional} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              <input type="checkbox" checked={form.published === "true"} onChange={(event) => setForm((current) => ({ ...current, published: String(event.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" />
              {t("admin.published")}
            </label>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingId ? t("common.update") : t("common.create")}</Button>
              {editingId ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>{t("common.cancel")}</Button> : null}
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="font-bold text-[var(--color-emerald)]">{t("admin.csvImport")}</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t("admin.csvImportHelp")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-card)]"><Upload className="h-4 w-4" />{t("admin.chooseCsv")}<input type="file" accept=".csv,text/csv" onChange={handleCsvImport} disabled={!hasSupabase || isPending} className="sr-only" /></label>
            <a href="/templates/prayer-times-template.csv" download className="inline-flex min-h-11 items-center rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-bold text-[var(--color-emerald)]">{t("admin.downloadCsvTemplate")}</a>
          </div>
        </Card>

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
                  <td className="px-3 py-3">{item.note || "-"}</td>
                  <td className="px-3 py-3">{item.published ? t("common.yes") : t("common.no")}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => fillForm(item)} disabled={isPending} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleTogglePublish(item.id, item.published)} disabled={isPending} aria-label={item.published ? t("admin.unpublish") : t("admin.publish")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">{item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button onClick={() => handleDelete(item.id)} disabled={isPending} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
