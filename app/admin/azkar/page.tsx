"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAzkarItems } from "@/lib/data/azkar";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedAzkarTranslation } from "@/lib/i18n/localized-content";
import type { AzkarCategory, AzkarItem } from "@/lib/types";
import { createAzkarAction, deleteAzkarAction, togglePublishAzkarAction, updateAzkarAction } from "./actions";

const categories: AzkarCategory[] = ["Morning", "Evening", "After Prayer", "Sleep", "Travel", "Friday"];

const emptyForm = {
  category: "Morning",
  arabicText: "",
  transliteration: "",
  translationAr: "",
  translationEn: "",
  translationDe: "",
  translationTr: "",
  repeatCount: "1",
  source: "",
  sortOrder: "0",
  isPublished: "true",
};

export default function AdminAzkarPage() {
  const { session } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<AzkarItem[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => { getAzkarItems(true).then((data) => setItems(data)).catch(() => setError(t("common.dataLoadFailed"))); }, [t]);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
  }

  function startEdit(item: AzkarItem) {
    setForm({
      category: item.category,
      arabicText: item.arabicText,
      transliteration: item.transliteration || "",
      translationAr: item.translationAr || "",
      translationEn: item.translationEn || "",
      translationDe: item.translationDe || "",
      translationTr: item.translationTr || "",
      repeatCount: String(item.repeatCount),
      source: item.source || "",
      sortOrder: String(item.sortOrder),
      isPublished: String(item.isPublished),
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function refreshItems() {
    setItems(await getAzkarItems(true));
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
      const result = editingId ? await updateAzkarAction(token, editingId, form) : await createAzkarAction(token, form);
      if (!result.success) {
        setError(t(result.error || "admin.errors.saveFailed"));
        return;
      }
      resetForm();
      setSuccess(t(editingId ? "admin.messages.updated" : "admin.messages.created"));
      await refreshItems();
    });
  }

  function handleDelete(id: string) {
    if (!confirm(t("admin.confirmDeleteAzkar"))) return;
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await deleteAzkarAction(token, id);
      if (!result.success) setError(t(result.error || "admin.errors.deleteFailed"));
      else {
        setSuccess(t("admin.messages.deleted"));
        refreshItems();
      }
    });
  }

  function handleTogglePublish(id: string, current: boolean) {
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await togglePublishAzkarAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else refreshItems();
    });
  }

  return (
    <AdminShell titleKey="admin.azkar">
      <div className="grid gap-5">
        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? t("admin.editAzkar") : t("admin.newAzkar")}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              {t("admin.category")}
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50">
                {categories.map((category) => <option key={category} value={category}>{t(`azkarCategories.${category}`)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              {t("admin.repeatCount")}
              <input type="number" min="1" required value={form.repeatCount} onChange={(event) => setForm((current) => ({ ...current, repeatCount: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              {t("admin.arabicText")}
              <textarea required value={form.arabicText} onChange={(event) => setForm((current) => ({ ...current, arabicText: event.target.value }))} disabled={!hasSupabase || isPending} rows={3} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              {t("admin.transliteration")}
              <textarea value={form.transliteration} onChange={(event) => setForm((current) => ({ ...current, transliteration: event.target.value }))} disabled={!hasSupabase || isPending} rows={2} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <LocalizedContentFields
              fields={[{ base: "translation", labelKey: "admin.translation", textarea: true }]}
              form={form}
              setForm={setForm}
              disabled={!hasSupabase || isPending}
            />
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              {t("admin.source")}
              <input type="text" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              {t("admin.sortOrder")}
              <input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              <input type="checkbox" checked={form.isPublished === "true"} onChange={(event) => setForm((current) => ({ ...current, isPublished: String(event.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" />
              {t("admin.published")}
            </label>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingId ? t("common.update") : t("common.create")}</Button>
              {editingId ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>{t("common.cancel")}</Button> : null}
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{t("admin.allAzkar")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
                <tr>{["admin.category", "admin.text", "admin.translation", "admin.repeat", "admin.published", "admin.actions"].map((key) => <th key={key} className="px-3 py-2">{t(key)}</th>)}</tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2">{t(`azkarCategories.${item.category}`)}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{item.arabicText}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{getLocalizedAzkarTranslation(item, locale)}</td>
                    <td className="px-3 py-2">{item.repeatCount}</td>
                    <td className="px-3 py-2">{item.isPublished ? <Check className="h-4 w-4 text-[var(--color-success)]" aria-label={t("admin.published")} /> : <span className="text-[var(--color-muted)]">{t("admin.draft")}</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(item)} disabled={isPending} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleTogglePublish(item.id, item.isPublished)} disabled={isPending} aria-label={t("admin.togglePublish")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Check className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(item.id)} disabled={isPending} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
