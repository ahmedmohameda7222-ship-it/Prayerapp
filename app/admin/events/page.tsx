"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getEvents } from "@/lib/data/events";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { Event } from "@/lib/types";
import { createEventAction, updateEventAction, deleteEventAction } from "./actions";

const emptyForm = { title: "", description: "", date: "", startTime: "", endTime: "", location: "", type: "" };

export default function AdminEventsPage() {
  const { session } = useAdminAuth();
  const [items, setItems] = useState<Event[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => { getEvents().then((d) => setItems(d)); }, []);

  function resetForm() { setForm({ ...emptyForm }); setEditingId(null); setError(""); setSuccess(""); }
  function fillForm(e: Event) { setForm({ title: e.title, description: e.description, date: e.date, startTime: e.startTime, endTime: e.endTime, location: e.location, type: e.type }); setEditingId(e.id); setError(""); setSuccess(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    const token = session?.access_token || "";
    if (!token) { setError("Not authenticated."); return; }
    startTransition(async () => {
      const result = editingId ? await updateEventAction(token, editingId, form) : await createEventAction(token, form);
      if (!result.success) setError(result.error || "Failed.");
      else { setSuccess(editingId ? "Updated." : "Created."); resetForm(); setItems(await getEvents()); }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return; setError("");
    const token = session?.access_token || "";
    startTransition(async () => { const result = await deleteEventAction(token, id); if (!result.success) setError(result.error || "Failed."); else { setSuccess("Deleted."); setItems(await getEvents()); } });
  }

  return (
    <AdminShell title="Events Management">
      <div className="grid gap-5">
        {!hasSupabase && <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> Supabase is not configured. Admin editing is disabled.</Card>}
        {error && <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card>}
        {success && <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card>}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? "Edit Event" : "Create Event"}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { k: "title", l: "Title" }, { k: "description", l: "Description" }, { k: "date", l: "Date", t: "date" },
              { k: "startTime", l: "Start Time", t: "time" }, { k: "endTime", l: "End Time", t: "time" },
              { k: "location", l: "Location" }, { k: "type", l: "Type" },
            ].map(({ k, l, t }) => (
              <label key={k} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">{l}
                <input type={t || "text"} required={k !== "endTime" && k !== "description"} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingId ? "Update" : "Create"}</Button>
              {editingId && <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>Cancel</Button>}
            </div>
          </form>
        </Card>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]"><tr>{["Title","Date","Time","Location","Type","Actions"].map((h)=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3"><p className="font-bold">{item.title}</p><p className="text-xs text-[var(--color-muted)]">{item.description.slice(0,40)}...</p></td>
                  <td className="px-3 py-3">{item.date}</td>
                  <td className="px-3 py-3">{item.startTime}{item.endTime ? `–${item.endTime}` : ""}</td>
                  <td className="px-3 py-3">{item.location}</td>
                  <td className="px-3 py-3">{item.type}</td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={() => fillForm(item)} disabled={isPending} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} disabled={isPending} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
