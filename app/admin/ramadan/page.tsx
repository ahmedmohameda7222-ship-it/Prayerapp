"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getRamadanDays } from "@/lib/data/ramadan";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { RamadanDay } from "@/lib/types";
import { createRamadanDayAction, deleteRamadanDayAction, updateRamadanDayAction } from "./actions";

const emptyForm = {
  date: "",
  ramadanDay: "",
  imsak: "",
  fajr: "",
  maghrib: "",
  iftar: "",
  taraweeh: "",
  noteAr: "",
  noteEn: "",
  noteDe: "",
  noteTr: "",
};

export default function AdminRamadanPage() {
  const { session } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<RamadanDay[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => { getRamadanDays().then((data) => setItems(data)); }, []);

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
  }

  function fillForm(item: RamadanDay) {
    setForm({
      date: item.date,
      ramadanDay: String(item.ramadanDay),
      imsak: item.imsak,
      fajr: item.fajr,
      maghrib: item.maghrib,
      iftar: item.iftar,
      taraweeh: item.taraweeh || "",
      noteAr: item.noteAr || item.note || "",
      noteEn: item.noteEn || "",
      noteDe: item.noteDe || "",
      noteTr: item.noteTr || "",
    });
    setEditingId(item.id);
    setError("");
    setSuccess("");
  }

  async function refreshItems() {
    setItems(await getRamadanDays());
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
      const result = editingId ? await updateRamadanDayAction(token, editingId, form) : await createRamadanDayAction(token, form);
      if (!result.success) setError(t(result.error || "admin.errors.saveFailed"));
      else {
        resetForm();
        setSuccess(t(editingId ? "admin.messages.updated" : "admin.messages.created"));
        await refreshItems();
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin.confirmDeleteRamadan"))) return;
    setError("");
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await deleteRamadanDayAction(token, id);
      if (!result.success) setError(t(result.error || "admin.errors.deleteFailed"));
      else {
        setSuccess(t("admin.messages.deleted"));
        await refreshItems();
      }
    });
  }

  return (
    <AdminShell titleKey="admin.ramadanManagement">
      <div className="grid gap-5">
        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? t("admin.editRamadanDay") : t("admin.createRamadanDay")}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { key: "date", labelKey: "admin.date", type: "date" },
              { key: "ramadanDay", labelKey: "admin.ramadanDayNumber", type: "number" },
              { key: "imsak", labelKey: "ramadan.imsak", type: "time" },
              { key: "fajr", labelKey: "ramadan.fajr", type: "time" },
              { key: "maghrib", labelKey: "prayer.maghrib", type: "time" },
              { key: "iftar", labelKey: "admin.iftar", type: "time" },
              { key: "taraweeh", labelKey: "ramadan.taraweeh", type: "time", optional: true },
            ].map(({ key, labelKey, type, optional }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input type={type} required={!optional} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <LocalizedContentFields
              fields={[{ base: "note", labelKey: "admin.note", textarea: true }]}
              form={form}
              setForm={setForm}
              disabled={!hasSupabase || isPending}
            />
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingId ? t("common.update") : t("common.create")}</Button>
              {editingId ? <Button type="button" variant="ghost" onClick={resetForm} disabled={isPending}>{t("common.cancel")}</Button> : null}
            </div>
          </form>
        </Card>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]"><tr>{["admin.day", "admin.date", "ramadan.imsak", "ramadan.fajr", "prayer.maghrib", "admin.iftar", "ramadan.taraweeh", "admin.note", "admin.actions"].map((key) => <th key={key} className="px-3 py-3">{t(key)}</th>)}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3">{item.ramadanDay}</td>
                  <td className="px-3 py-3">{item.date}</td>
                  <td className="px-3 py-3">{item.imsak}</td>
                  <td className="px-3 py-3">{item.fajr}</td>
                  <td className="px-3 py-3">{item.maghrib}</td>
                  <td className="px-3 py-3">{item.iftar}</td>
                  <td className="px-3 py-3">{item.taraweeh || "-"}</td>
                  <td className="px-3 py-3">{getLocalizedField(item, "note", locale) || "-"}</td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={() => fillForm(item)} disabled={isPending} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} disabled={isPending} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
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
