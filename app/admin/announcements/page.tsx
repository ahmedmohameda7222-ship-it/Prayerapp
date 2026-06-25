"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { getAnnouncements } from "@/lib/data/announcements";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { Announcement, AnnouncementType } from "@/lib/types";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  togglePublishAnnouncementAction,
  toggleUrgentAnnouncementAction,
  updateAnnouncementAction,
} from "./actions";

const validTypes: AnnouncementType[] = ["General", "Urgent", "Location update", "Community", "Ramadan", "Eid", "Donation"];

const emptyForm = {
  titleAr: "",
  titleEn: "",
  titleDe: "",
  titleTr: "",
  messageAr: "",
  messageEn: "",
  messageDe: "",
  messageTr: "",
  type: "General",
  isUrgent: "false",
  published: "true",
};

export default function AdminAnnouncementsPage() {
  const { session } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    getAnnouncements().then((data) => setItems(data));
  }, []);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
  }

  function fillForm(item: Announcement) {
    setForm({
      titleAr: item.titleAr || item.title,
      titleEn: item.titleEn || "",
      titleDe: item.titleDe || "",
      titleTr: item.titleTr || "",
      messageAr: item.messageAr || item.message,
      messageEn: item.messageEn || "",
      messageDe: item.messageDe || "",
      messageTr: item.messageTr || "",
      type: item.type,
      isUrgent: String(item.isUrgent),
      published: String(item.published),
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function refreshItems() {
    setItems(await getAnnouncements());
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
      const result = editingId
        ? await updateAnnouncementAction(token, editingId, form)
        : await createAnnouncementAction(token, form);

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
    if (!confirm(t("admin.confirmDeleteAnnouncement"))) return;
    setError("");
    const token = session?.access_token || "";
    if (!token) return;

    startTransition(async () => {
      const result = await deleteAnnouncementAction(token, id);
      if (!result.success) {
        setError(t(result.error || "admin.errors.deleteFailed"));
        return;
      }
      setSuccess(t("admin.messages.deleted"));
      await refreshItems();
    });
  }

  async function handleTogglePublish(id: string, current: boolean) {
    setError("");
    const token = session?.access_token || "";
    if (!token) return;
    startTransition(async () => {
      const result = await togglePublishAnnouncementAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshItems();
    });
  }

  async function handleToggleUrgent(id: string, current: boolean) {
    setError("");
    const token = session?.access_token || "";
    if (!token) return;
    startTransition(async () => {
      const result = await toggleUrgentAnnouncementAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshItems();
    });
  }

  return (
    <AdminShell titleKey="admin.announcementsManagement">
      <div className="grid gap-5">
        {!hasSupabase && (
          <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            {t("admin.supabaseNotConfigured")}
          </Card>
        )}

        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">
            {editingId ? t("admin.editAnnouncement") : t("admin.createAnnouncement")}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <LocalizedContentFields
              fields={[
                { base: "title", labelKey: "admin.title", requiredArabic: true },
                { base: "message", labelKey: "admin.message", textarea: true, requiredArabic: true },
              ]}
              form={form}
              setForm={setForm}
              disabled={!hasSupabase || isPending}
            />

            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              {t("admin.type")}
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                disabled={!hasSupabase || isPending}
                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
              >
                {validTypes.map((type) => (
                  <option key={type} value={type}>{t(`announcementTypes.${type}`)}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input
                  type="checkbox"
                  checked={form.isUrgent === "true"}
                  onChange={(event) => setForm((current) => ({ ...current, isUrgent: String(event.target.checked) }))}
                  disabled={!hasSupabase || isPending}
                  className="h-5 w-5 accent-[var(--color-emerald)]"
                />
                {t("admin.markUrgent")}
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input
                  type="checkbox"
                  checked={form.published === "true"}
                  onChange={(event) => setForm((current) => ({ ...current, published: String(event.target.checked) }))}
                  disabled={!hasSupabase || isPending}
                  className="h-5 w-5 accent-[var(--color-emerald)]"
                />
                {t("admin.published")}
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={!hasSupabase || isPending}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {editingId ? t("common.update") : t("common.create")}
              </Button>
              <Button type="button" variant="soft" onClick={() => setError(t("admin.translationNotConfigured"))}>
                {t("admin.generateTranslations")}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>
                  {t("common.cancel")}
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
              <tr>
                {["admin.title", "admin.type", "admin.urgent", "admin.published", "admin.actions"].map((key) => (
                  <th key={key} className="px-3 py-3">{t(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3">
                    <p className="font-bold">{getLocalizedField(item, "title", locale)}</p>
                    <p className="text-xs text-[var(--color-muted)]">{getLocalizedField(item, "message", locale).slice(0, 60)}...</p>
                  </td>
                  <td className="px-3 py-3">{t(`announcementTypes.${item.type}`)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleToggleUrgent(item.id, item.isUrgent)}
                      disabled={isPending}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${item.isUrgent ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]" : "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"}`}
                    >
                      {item.isUrgent ? t("admin.urgent") : t("admin.normal")}
                    </button>
                  </td>
                  <td className="px-3 py-3">{item.published ? t("common.yes") : t("common.no")}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => fillForm(item)} disabled={isPending} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleTogglePublish(item.id, item.published)} disabled={isPending} aria-label={item.published ? t("admin.unpublish") : t("admin.publish")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
                        {item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDelete(item.id)} disabled={isPending} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
