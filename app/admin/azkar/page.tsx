"use client";

import { useState, useEffect, useTransition } from "react";
import { AlertTriangle, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAzkarItems } from "@/lib/data/azkar";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { AzkarItem, AzkarCategory } from "@/lib/types";
import { createAzkarAction, updateAzkarAction, deleteAzkarAction, togglePublishAzkarAction } from "./actions";

const categories: AzkarCategory[] = ["Morning", "Evening", "After Prayer", "Sleep", "Travel", "Friday"];

export default function AdminAzkarPage() {
  const { session } = useAdminAuth();
  const [items, setItems] = useState<AzkarItem[]>([]);
  const [form, setForm] = useState<Record<string, string>>({
    category: "Morning",
    arabicText: "",
    transliteration: "",
    translationEn: "",
    translationDe: "",
    repeatCount: "1",
    source: "",
    sortOrder: "0",
    isPublished: "true",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    getAzkarItems().then((data) => setItems(data));
  }, []);

  function resetForm() {
    setForm({
      category: "Morning",
      arabicText: "",
      transliteration: "",
      translationEn: "",
      translationDe: "",
      repeatCount: "1",
      source: "",
      sortOrder: "0",
      isPublished: "true",
    });
    setEditingId(null);
  }

  function startEdit(item: AzkarItem) {
    setForm({
      category: item.category,
      arabicText: item.arabicText,
      transliteration: item.transliteration || "",
      translationEn: item.translationEn || "",
      translationDe: item.translationDe || "",
      repeatCount: String(item.repeatCount),
      source: item.source || "",
      sortOrder: String(item.sortOrder),
      isPublished: String(item.isPublished),
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    const token = session?.access_token || "";
    if (!token) { setError("Not authenticated."); return; }
    startTransition(async () => {
      if (editingId) {
        const result = await updateAzkarAction(token, editingId, form);
        if (!result.success) setError(result.error || "Failed.");
        else { setSuccess("Azkar updated."); resetForm(); }
      } else {
        const result = await createAzkarAction(token, form);
        if (!result.success) setError(result.error || "Failed.");
        else { setSuccess("Azkar created."); resetForm(); }
      }
      setItems(await getAzkarItems());
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await deleteAzkarAction(token, id);
      if (!result.success) setError(result.error || "Failed.");
      else { setSuccess("Deleted."); setItems(await getAzkarItems()); }
    });
  }

  function handleTogglePublish(id: string, current: boolean) {
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await togglePublishAzkarAction(token, id, !current);
      if (!result.success) setError(result.error || "Failed.");
      else setItems(await getAzkarItems());
    });
  }

  return (
    <AdminShell title="Azkar & Duaa">
      <div className="grid gap-5">
        {!hasSupabase && <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> Supabase is not configured. Admin editing is disabled.</Card>}
        {error && <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card>}
        {success && <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card>}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? "Edit Azkar" : "New Azkar"}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">Category
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">Repeat Count
              <input type="number" min="1" required value={form.repeatCount} onChange={(e) => setForm((f) => ({ ...f, repeatCount: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">Arabic Text
              <textarea required value={form.arabicText} onChange={(e) => setForm((f) => ({ ...f, arabicText: e.target.value }))} disabled={!hasSupabase || isPending} rows={3} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">Transliteration
              <textarea value={form.transliteration} onChange={(e) => setForm((f) => ({ ...f, transliteration: e.target.value }))} disabled={!hasSupabase || isPending} rows={2} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">Translation (EN)
              <textarea value={form.translationEn} onChange={(e) => setForm((f) => ({ ...f, translationEn: e.target.value }))} disabled={!hasSupabase || isPending} rows={2} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">Translation (DE)
              <textarea value={form.translationDe} onChange={(e) => setForm((f) => ({ ...f, translationDe: e.target.value }))} disabled={!hasSupabase || isPending} rows={2} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">Source
              <input type="text" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">Sort Order
              <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              <input type="checkbox" checked={form.isPublished === "true"} onChange={(e) => setForm((f) => ({ ...f, isPublished: String(e.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" />
              Published
            </label>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingId ? "Update" : "Create"}</Button>
              {editingId && <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>Cancel</Button>}
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">All Azkar</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
                <tr><th className="px-3 py-2">Category</th><th className="px-3 py-2">Text</th><th className="px-3 py-2">Repeat</th><th className="px-3 py-2">Published</th><th className="px-3 py-2">Actions</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2">{item.category}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{item.arabicText}</td>
                    <td className="px-3 py-2">{item.repeatCount}</td>
                    <td className="px-3 py-2">{item.isPublished ? <Check className="h-4 w-4 text-[var(--color-success)]" aria-label="Published" /> : <span className="text-[var(--color-muted)]">Draft</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(item)} disabled={isPending} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleTogglePublish(item.id, item.isPublished)} disabled={isPending} aria-label="Toggle publish" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Check className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(item.id)} disabled={isPending} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
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
