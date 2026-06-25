"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAnnouncements } from "@/lib/data/announcements";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { Announcement, AnnouncementType } from "@/lib/types";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
  togglePublishAnnouncementAction,
  toggleUrgentAnnouncementAction,
} from "./actions";

const validTypes: AnnouncementType[] = ["General", "Urgent", "Location update", "Community", "Ramadan", "Eid", "Donation"];

const emptyForm = {
  title: "",
  message: "",
  type: "General",
  isUrgent: "false",
  published: "true",
};

export default function AdminAnnouncementsPage() {
  const { session } = useAdminAuth();
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
    setSuccess("");
  }

  function fillForm(item: Announcement) {
    setForm({
      title: item.title,
      message: item.message,
      type: item.type,
      isUrgent: String(item.isUrgent),
      published: String(item.published),
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const token = session?.access_token || "";
    if (!token) {
      setError("Not authenticated.");
      return;
    }

    startTransition(async () => {
      const result = editingId
        ? await updateAnnouncementAction(token, editingId, form)
        : await createAnnouncementAction(token, form);

      if (!result.success) {
        setError(result.error || "Failed to save.");
      } else {
        setSuccess(editingId ? "Updated successfully." : "Created successfully.");
        resetForm();
        const fresh = await getAnnouncements();
        setItems(fresh);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    setError("");
    const token = session?.access_token || "";
    if (!token) return;

    startTransition(async () => {
      const result = await deleteAnnouncementAction(token, id);
      if (!result.success) {
        setError(result.error || "Failed to delete.");
      } else {
        setSuccess("Deleted successfully.");
        const fresh = await getAnnouncements();
        setItems(fresh);
      }
    });
  }

  async function handleTogglePublish(id: string, current: boolean) {
    setError("");
    const token = session?.access_token || "";
    if (!token) return;

    startTransition(async () => {
      const result = await togglePublishAnnouncementAction(token, id, !current);
      if (!result.success) {
        setError(result.error || "Failed to toggle.");
      } else {
        const fresh = await getAnnouncements();
        setItems(fresh);
      }
    });
  }

  async function handleToggleUrgent(id: string, current: boolean) {
    setError("");
    const token = session?.access_token || "";
    if (!token) return;

    startTransition(async () => {
      const result = await toggleUrgentAnnouncementAction(token, id, !current);
      if (!result.success) {
        setError(result.error || "Failed to toggle.");
      } else {
        const fresh = await getAnnouncements();
        setItems(fresh);
      }
    });
  }

  return (
    <AdminShell title="Announcements Management">
      <div className="grid gap-5">

        {!hasSupabase && (
          <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Supabase is not configured. Admin editing is disabled.
          </Card>
        )}

        {error && (
          <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card>
        )}
        {success && (
          <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">
            {editingId ? "Edit Announcement" : "Create Announcement"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              Title
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={!hasSupabase || isPending}
                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              Type
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                disabled={!hasSupabase || isPending}
                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
              >
                {validTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
              Message
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                disabled={!hasSupabase || isPending}
                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
              />
            </label>

            <div className="flex gap-4">
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input
                  type="checkbox"
                  checked={form.isUrgent === "true"}
                  onChange={(e) => setForm((f) => ({ ...f, isUrgent: String(e.target.checked) }))}
                  disabled={!hasSupabase || isPending}
                  className="h-5 w-5 accent-[var(--color-emerald)]"
                />
                Mark urgent
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input
                  type="checkbox"
                  checked={form.published === "true"}
                  onChange={(e) => setForm((f) => ({ ...f, published: String(e.target.checked) }))}
                  disabled={!hasSupabase || isPending}
                  className="h-5 w-5 accent-[var(--color-emerald)]"
                />
                Published
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={!hasSupabase || isPending}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {editingId ? "Update" : "Create"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
              <tr>
                {["Title", "Type", "Urgent", "Published", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3">
                    <p className="font-bold">{item.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">{item.message.slice(0, 60)}...</p>
                  </td>
                  <td className="px-3 py-3">{item.type}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleToggleUrgent(item.id, item.isUrgent)}
                      disabled={isPending}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${item.isUrgent ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]" : "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"}`}
                    >
                      {item.isUrgent ? "Urgent" : "Normal"}
                    </button>
                  </td>
                  <td className="px-3 py-3">{item.published ? "Yes" : "No"}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => fillForm(item)}
                        disabled={isPending}
                        aria-label="Edit"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePublish(item.id, item.published)}
                        disabled={isPending}
                        aria-label={item.published ? "Unpublish" : "Publish"}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"
                      >
                        {item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        aria-label="Delete"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                      >
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
