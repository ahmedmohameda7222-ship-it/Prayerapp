"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AlertTriangle, Plus, Upload } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { PrayerTimesTable } from "@/components/admin/PrayerTimesTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { invalidateCachePrefix } from "@/lib/data/cache";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import { getMissingPublishedPrayerDates } from "@/lib/prayer-coverage";
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
  maghribProgramEnabled: "false",
  maghribLessonTitle: "",
  maghribLessonDurationMinutes: "",
  maghribCombinedIshaTime: "",
  note: "",
  published: "true",
};

export default function AdminPrayerTimesPage() {
  const { session } = useAdminAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<PrayerTime[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();
  const accessToken = session?.access_token || "";
  const nextWeekStart = addDaysIso(todayIso(), 1);
  const nextWeekMissing = getMissingPublishedPrayerDates(items, nextWeekStart, 7).length > 0;

  useEffect(() => {
    getPrayerTimes(true)
      .then((data) => {
        setItems(data);
        setItemsLoaded(true);
      })
      .catch(() => {
        setItemsLoaded(true);
        setError(t("common.dataLoadFailed"));
      });
  }, [t]);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
  }

  const fillForm = useCallback((item: PrayerTime) => {
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
      maghribProgramEnabled: String(item.maghribProgram?.enabled || false),
      maghribLessonTitle: item.maghribProgram?.lessonTitle || "",
      maghribLessonDurationMinutes: item.maghribProgram?.lessonDurationMinutes?.toString() || "",
      maghribCombinedIshaTime: item.maghribProgram?.combinedIshaTime || "",
      note: item.note || "",
      published: String(item.published),
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }, []);

  const refreshItems = useCallback(async () => {
    invalidateCachePrefix("prayer_times");
    setItems(await getPrayerTimes(true));
    setItemsLoaded(true);
  }, []);

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

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(t("admin.confirmDeletePrayerTime"))) return;
    setError("");
    if (!accessToken) return;
    startTransition(async () => {
      const result = await deletePrayerTimeAction(accessToken, id);
      if (!result.success) setError(t(result.error || "admin.errors.deleteFailed"));
      else {
        setSuccess(t("admin.messages.deleted"));
        await refreshItems();
      }
    });
  }, [accessToken, refreshItems, t]);

  const handleTogglePublish = useCallback(async (id: string, current: boolean) => {
    setError("");
    if (!accessToken) return;
    startTransition(async () => {
      const result = await togglePublishPrayerTimeAction(accessToken, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshItems();
    });
  }, [accessToken, refreshItems, t]);

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
    { key: "dhuhrIqama", labelKey: "admin.dhuhrIqama", type: "time", optional: true },
    { key: "asrIqama", labelKey: "admin.asrIqama", type: "time", optional: true },
    { key: "ishaIqama", labelKey: "admin.ishaIqama", type: "time", optional: true },
    { key: "note", labelKey: "admin.note", type: "text", optional: true },
  ];

  return (
    <AdminShell titleKey="admin.prayerTimesManagement">
      <div className="grid gap-5">
        {itemsLoaded && nextWeekMissing ? <AdminWarningCard message={t("admin.missingNextWeek")} /> : null}

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
            <section className="grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] p-4 md:col-span-2">
              <div>
                <h3 className="font-extrabold text-[var(--color-emerald)]">{t("admin.homePrayerDisplaySettings")}</h3>
                <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">{t("admin.homePrayerDisplaySettingsHelp")}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                  {t("prayer.salatFajr")}
                  <input type="time" value={form.fajrIqama} onChange={(event) => setForm((current) => ({ ...current, fajrIqama: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-card)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                  <input type="checkbox" checked={form.maghribProgramEnabled === "true"} onChange={(event) => setForm((current) => ({ ...current, maghribProgramEnabled: String(event.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" />
                  {t("admin.enableMaghribProgram")}
                </label>
                {form.maghribProgramEnabled === "true" ? (
                  <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                    <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                      {t("prayer.salatMaghrib")}
                      <input type="time" value={form.maghribIqama} onChange={(event) => setForm((current) => ({ ...current, maghribIqama: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                      {t("admin.lessonTitle")}
                      <input type="text" maxLength={160} value={form.maghribLessonTitle} onChange={(event) => setForm((current) => ({ ...current, maghribLessonTitle: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                      {t("admin.lessonDurationMinutes")}
                      <input type="number" min="1" max="240" step="1" value={form.maghribLessonDurationMinutes} onChange={(event) => setForm((current) => ({ ...current, maghribLessonDurationMinutes: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                      {t("admin.combinedSalatIsha")}
                      <input type="time" value={form.maghribCombinedIshaTime} onChange={(event) => setForm((current) => ({ ...current, maghribCombinedIshaTime: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
                    </label>
                  </div>
                ) : null}
              </div>
            </section>
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

        <PrayerTimesTable items={items} disabled={isPending} onEdit={fillForm} onTogglePublish={handleTogglePublish} onDelete={handleDelete} />
      </div>
    </AdminShell>
  );
}
