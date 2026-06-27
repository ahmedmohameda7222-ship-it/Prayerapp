"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { JumuahTime } from "@/lib/types";
import { createJumuahAction, deleteJumuahAction, togglePublishJumuahAction, updateJumuahAction } from "./actions";

const emptyForm = {
  date: "",
  khutbahTime: "",
  prayerTime: "",
  locationName: "",
  locationAddress: "",
  khateebName: "",
  languageAr: "",
  languageEn: "",
  languageDe: "",
  languageTr: "",
  notesAr: "",
  notesEn: "",
  notesDe: "",
  notesTr: "",
  published: "true",
};

export default function AdminJumuahPage() {
  const { session } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<JumuahTime[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => { getJumuahTimes(true).then((data) => setItems(data)).catch(() => setError(t("common.dataLoadFailed"))); }, [t]);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
  }

  function fillForm(item: JumuahTime) {
    setForm({
      date: item.date,
      khutbahTime: item.khutbahTime,
      prayerTime: item.prayerTime,
      locationName: item.locationName || "",
      locationAddress: item.locationAddress || "",
      khateebName: item.khateebName || "",
      languageAr: item.languageAr || item.language,
      languageEn: item.languageEn || "",
      languageDe: item.languageDe || "",
      languageTr: item.languageTr || "",
      notesAr: item.notesAr || item.notes || "",
      notesEn: item.notesEn || "",
      notesDe: item.notesDe || "",
      notesTr: item.notesTr || "",
      published: String(item.published),
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function refreshItems() {
    setItems(await getJumuahTimes(true));
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
      const result = editingId ? await updateJumuahAction(token, editingId, form) : await createJumuahAction(token, form);
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
    if (!confirm(t("admin.confirmDeleteJumuah"))) return;
    setError("");
    const token = session?.access_token || "";
    if (!token) return;
    startTransition(async () => {
      const result = await deleteJumuahAction(token, id);
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
      const result = await togglePublishJumuahAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshItems();
    });
  }

  return (
    <AdminShell titleKey="admin.jumuahManagement">
      <div className="grid gap-5">
        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? t("admin.editJumuah") : t("admin.addJumuah")}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { key: "date", labelKey: "admin.date", type: "date" },
              { key: "khutbahTime", labelKey: "friday.khutbahTime", type: "time" },
              { key: "prayerTime", labelKey: "friday.jumuahPrayer", type: "time" },
              { key: "locationName", labelKey: "admin.locationName", type: "text", optional: true },
              { key: "locationAddress", labelKey: "admin.locationAddress", type: "text", optional: true },
              { key: "khateebName", labelKey: "friday.khateeb", type: "text", optional: true },
            ].map(({ key, labelKey, type, optional }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input type={type} required={!optional} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <LocalizedContentFields
              fields={[
                { base: "language", labelKey: "friday.language", requiredArabic: true },
                { base: "notes", labelKey: "admin.notes", textarea: true },
              ]}
              form={form}
              setForm={setForm}
              disabled={!hasSupabase || isPending}
            />
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

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
              <tr>{["admin.date", "prayer.khutbah", "prayer.prayer", "friday.location", "friday.khateeb", "friday.language", "admin.published", "admin.actions"].map((key) => <th key={key} className="px-3 py-3">{t(key)}</th>)}</tr>
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
