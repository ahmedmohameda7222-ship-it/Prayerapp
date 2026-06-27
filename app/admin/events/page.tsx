"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getEvents } from "@/lib/data/events";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { Event } from "@/lib/types";
import { createEventAction, deleteEventAction, updateEventAction } from "./actions";

const eventTypes = ["Class", "Community", "Youth", "Sisters", "Iftar"] as const;

const emptyForm = {
  titleAr: "",
  titleEn: "",
  titleDe: "",
  titleTr: "",
  descriptionAr: "",
  descriptionEn: "",
  descriptionDe: "",
  descriptionTr: "",
  locationAr: "",
  locationEn: "",
  locationDe: "",
  locationTr: "",
  date: "",
  startTime: "",
  endTime: "",
  type: "Class",
};

export default function AdminEventsPage() {
  const { session } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<Event[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => { getEvents(true).then((data) => setItems(data)).catch(() => setError(t("common.dataLoadFailed"))); }, [t]);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
  }

  function fillForm(item: Event) {
    setForm({
      titleAr: item.titleAr || item.title,
      titleEn: item.titleEn || "",
      titleDe: item.titleDe || "",
      titleTr: item.titleTr || "",
      descriptionAr: item.descriptionAr || item.description,
      descriptionEn: item.descriptionEn || "",
      descriptionDe: item.descriptionDe || "",
      descriptionTr: item.descriptionTr || "",
      locationAr: item.locationAr || item.location,
      locationEn: item.locationEn || "",
      locationDe: item.locationDe || "",
      locationTr: item.locationTr || "",
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type,
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function refreshItems() {
    setItems(await getEvents(true));
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
      const result = editingId ? await updateEventAction(token, editingId, form) : await createEventAction(token, form);
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
    if (!confirm(t("admin.confirmDeleteEvent"))) return;
    setError("");
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await deleteEventAction(token, id);
      if (!result.success) setError(t(result.error || "admin.errors.deleteFailed"));
      else {
        setSuccess(t("admin.messages.deleted"));
        await refreshItems();
      }
    });
  }

  return (
    <AdminShell titleKey="admin.eventsManagement">
      <div className="grid gap-5">
        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? t("admin.editEvent") : t("admin.createEvent")}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <LocalizedContentFields
              fields={[
                { base: "title", labelKey: "admin.title", requiredArabic: true },
                { base: "description", labelKey: "admin.description", textarea: true, requiredArabic: true },
                { base: "location", labelKey: "admin.location", requiredArabic: true },
              ]}
              form={form}
              setForm={setForm}
              disabled={!hasSupabase || isPending}
            />
            {[
              { key: "date", labelKey: "admin.date", type: "date" },
              { key: "startTime", labelKey: "admin.startTime", type: "time" },
              { key: "endTime", labelKey: "admin.endTime", type: "time", optional: true },
            ].map(({ key, labelKey, type, optional }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input
                  type={type}
                  required={!optional}
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  disabled={!hasSupabase || isPending}
                  className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
                />
              </label>
            ))}
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              {t("admin.type")}
              <select
                required
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                disabled={!hasSupabase || isPending}
                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
              >
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{t(`eventTypes.${type}`)}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingId ? t("common.update") : t("common.create")}</Button>
              {editingId ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>{t("common.cancel")}</Button> : null}
            </div>
          </form>
        </Card>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
              <tr>{["admin.title", "admin.date", "admin.time", "admin.location", "admin.type", "admin.actions"].map((key) => <th key={key} className="px-3 py-3">{t(key)}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3"><p className="font-bold">{getLocalizedField(item, "title", locale)}</p><p className="text-xs text-[var(--color-muted)]">{getLocalizedField(item, "description", locale).slice(0, 40)}...</p></td>
                  <td className="px-3 py-3">{item.date}</td>
                  <td className="px-3 py-3">{item.startTime}{item.endTime ? `-${item.endTime}` : ""}</td>
                  <td className="px-3 py-3">{getLocalizedField(item, "location", locale)}</td>
                  <td className="px-3 py-3">{t(`eventTypes.${item.type}`)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => fillForm(item)} disabled={isPending} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
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
