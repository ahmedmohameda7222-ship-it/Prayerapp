"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { PrayerTime } from "@/lib/types";
import {
  createPrayerTimeAction,
  updatePrayerTimeAction,
  deletePrayerTimeAction,
  togglePublishPrayerTimeAction,
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
  const [items, setItems] = useState<PrayerTime[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    getPrayerTimes().then((data) => {
      setItems(data);
    });
  }, []);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
    setSuccess("");
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
        ? await updatePrayerTimeAction(token, editingId, form)
        : await createPrayerTimeAction(token, form);

      if (!result.success) {
        setError(result.error || "Failed to save.");
      } else {
        setSuccess(editingId ? "Updated successfully." : "Created successfully.");
        resetForm();
        const fresh = await getPrayerTimes();
        setItems(fresh);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this prayer time?")) return;
    setError("");
    const token = session?.access_token || "";
    if (!token) return;

    startTransition(async () => {
      const result = await deletePrayerTimeAction(token, id);
      if (!result.success) {
        setError(result.error || "Failed to delete.");
      } else {
        setSuccess("Deleted successfully.");
        const fresh = await getPrayerTimes();
        setItems(fresh);
      }
    });
  }

  async function handleTogglePublish(id: string, current: boolean) {
    setError("");
    const token = session?.access_token || "";
    if (!token) return;

    startTransition(async () => {
      const result = await togglePublishPrayerTimeAction(token, id, !current);
      if (!result.success) {
        setError(result.error || "Failed to toggle.");
      } else {
        const fresh = await getPrayerTimes();
        setItems(fresh);
      }
    });
  }

  const tableHeaders = [
    "Date", "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha",
    "Fajr Iqama", "Dhuhr Iqama", "Asr Iqama", "Maghrib Iqama", "Isha Iqama",
    "Note", "Published", "Actions",
  ];

  return (
    <AdminShell title="Prayer Times Management">
      <div className="grid gap-5">
        <AdminWarningCard message="Prayer times for next week are missing." />

        {!hasSupabase && (
          <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Supabase is not configured. Admin editing is disabled.
          </Card>
        )}

        {error && (
          <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">
            {error}
          </Card>
        )}
        {success && (
          <Card className="p-4 text-sm font-bold text-[var(--color-success)]">
            {success}
          </Card>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">
            {editingId ? "Edit Prayer Time" : "Create Prayer Time"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { key: "date", label: "Date", type: "date" },
              { key: "fajr", label: "Fajr", type: "time" },
              { key: "sunrise", label: "Sunrise", type: "time" },
              { key: "dhuhr", label: "Dhuhr", type: "time" },
              { key: "asr", label: "Asr", type: "time" },
              { key: "maghrib", label: "Maghrib", type: "time" },
              { key: "isha", label: "Isha", type: "time" },
              { key: "fajrIqama", label: "Fajr Iqama", type: "time" },
              { key: "dhuhrIqama", label: "Dhuhr Iqama", type: "time" },
              { key: "asrIqama", label: "Asr Iqama", type: "time" },
              { key: "maghribIqama", label: "Maghrib Iqama", type: "time" },
              { key: "ishaIqama", label: "Isha Iqama", type: "time" },
              { key: "note", label: "Note", type: "text" },
            ].map(({ key, label, type }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {label}
                <input
                  type={type}
                  required={key === "date" || !key.includes("Iqama")}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  disabled={!hasSupabase || isPending}
                  className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
                />
              </label>
            ))}
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              <input
                type="checkbox"
                checked={form.published === "true"}
                onChange={(e) => setForm((f) => ({ ...f, published: String(e.target.checked) }))}
                disabled={!hasSupabase || isPending}
                className="h-5 w-5 accent-[var(--color-emerald)]"
              />
              Published
            </label>
            <div className="flex gap-3 md:col-span-2">
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

        <div className="admin-grid">
          {["Weekly editor placeholder", "Monthly editor placeholder", "CSV import placeholder"].map((title) => (
            <section key={title} className="card p-4">
              <h2 className="font-bold text-[var(--color-emerald)]">{title}</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">This area is ready for backend connection later.</p>
            </section>
          ))}
        </div>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]">
              <tr>
                {tableHeaders.map((h) => (
                  <th key={h} className="px-3 py-3">{h}</th>
                ))}
              </tr>
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
