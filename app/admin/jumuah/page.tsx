"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, LockKeyhole, Plus } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { JumuahTable } from "@/components/admin/JumuahTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import { isFridayIso } from "@/lib/friday";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { JumuahTime, PrayerTime } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { createJumuahAction, deleteJumuahAction, togglePublishJumuahAction, updateJumuahAction } from "./actions";

const COPY: Record<Locale, {
  friday: string;
  primary: string;
  primaryHelp: string;
  additional: string;
  additionalHelp: string;
  noFriday: string;
}> = {
  ar: {
    friday: "اختر الجمعة",
    primary: "الجمعة الرئيسية",
    primaryHelp: "تُنشأ تلقائيًا من وقت الظهر ولا يمكن تعديلها أو حذفها أو إلغاء نشرها هنا.",
    additional: "صلاة جمعة إضافية",
    additionalHelp: "أدخل وقت صلاة واحد فقط، ويجب أن يكون بعد وقت الجمعة الرئيسية.",
    noFriday: "لا توجد مواعيد جمعة مستقبلية في جدول الصلاة.",
  },
  en: {
    friday: "Select Friday",
    primary: "Primary Jumu'ah",
    primaryHelp: "Generated automatically from Dhuhr and cannot be edited, deleted, or unpublished here.",
    additional: "Additional Jumu'ah",
    additionalHelp: "Enter one prayer time only. It must be later than Primary.",
    noFriday: "No future Friday prayer rows are available in the prayer schedule.",
  },
  de: {
    friday: "Freitag auswählen",
    primary: "Haupt-Freitagsgebet",
    primaryHelp: "Wird automatisch aus Dhuhr erzeugt und kann hier nicht bearbeitet, gelöscht oder unveröffentlicht werden.",
    additional: "Zusätzliches Freitagsgebet",
    additionalHelp: "Nur eine Gebetszeit eingeben. Sie muss nach dem Hauptgebet liegen.",
    noFriday: "Im Gebetsplan sind keine zukünftigen Freitage verfügbar.",
  },
  tr: {
    friday: "Cuma gününü seç",
    primary: "Ana Cuma namazı",
    primaryHelp: "Öğle vaktinden otomatik oluşturulur; burada değiştirilemez, silinemez veya yayından kaldırılamaz.",
    additional: "Ek Cuma namazı",
    additionalHelp: "Yalnızca bir namaz saati girin. Ana Cuma namazından sonra olmalıdır.",
    noFriday: "Namaz programında gelecekteki bir Cuma satırı bulunmuyor.",
  },
};

const emptyForm = {
  date: "",
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
  const copy = COPY[locale];
  const [items, setItems] = useState<JumuahTime[]>([]);
  const [fridayPrayers, setFridayPrayers] = useState<PrayerTime[]>([]);
  const [selectedFriday, setSelectedFriday] = useState("");
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    const start = todayIso();
    const end = addDaysIso(start, 180);
    Promise.all([getPrayerTimes(true, start, end), getJumuahTimes(true)])
      .then(([prayers, jumuah]) => {
        const futureFridays = prayers
          .filter((prayer) => prayer.date >= start && isFridayIso(prayer.date))
          .sort((a, b) => a.date.localeCompare(b.date));
        setFridayPrayers(futureFridays);
        setItems(jumuah);
        const firstFriday = futureFridays[0]?.date || "";
        setSelectedFriday((current) => current || firstFriday);
        setForm((current) => ({ ...current, date: current.date || firstFriday }));
      })
      .catch(() => setError(t("common.dataLoadFailed")));
  }, [t]);

  const selectedPrayer = useMemo(
    () => fridayPrayers.find((prayer) => prayer.date === selectedFriday),
    [fridayPrayers, selectedFriday],
  );
  const selectedItems = useMemo(
    () => items.filter((item) => item.date === selectedFriday).sort((a, b) => a.prayerTime.localeCompare(b.prayerTime)),
    [items, selectedFriday],
  );

  function resetForm(date = selectedFriday) {
    setForm({ ...emptyForm, date });
    setEditingId(null);
    setError("");
  }

  const fillForm = useCallback((item: JumuahTime) => {
    setSelectedFriday(item.date);
    setForm({
      date: item.date,
      prayerTime: item.prayerTime,
      locationName: item.locationName || "",
      locationAddress: item.locationAddress || "",
      khateebName: item.khateebName || "",
      languageAr: item.languageAr || item.language || "",
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
  }, []);

  const refreshItems = useCallback(async () => {
    setItems(await getJumuahTimes(true));
  }, []);

  function handleFridayChange(date: string) {
    setSelectedFriday(date);
    setForm({ ...emptyForm, date });
    setEditingId(null);
    setError("");
    setSuccess("");
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
    if (!selectedPrayer) {
      setError(t("admin.errors.invalidInput"));
      return;
    }
    const payload = { ...form, date: selectedFriday };
    const wasEditing = Boolean(editingId);
    startTransition(async () => {
      const result = editingId
        ? await updateJumuahAction(token, editingId, payload)
        : await createJumuahAction(token, payload);
      if (!result.success) {
        setError(t(result.error || "admin.errors.saveFailed"));
        return;
      }
      resetForm(selectedFriday);
      setSuccess(t(wasEditing ? "admin.messages.updated" : "admin.messages.created"));
      await refreshItems();
    });
  }

  const handleDelete = useCallback(async (id: string) => {
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
  }, [session, refreshItems, t]);

  const handleTogglePublish = useCallback(async (id: string, current: boolean) => {
    setError("");
    const token = session?.access_token || "";
    if (!token) return;
    startTransition(async () => {
      const result = await togglePublishJumuahAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshItems();
    });
  }, [session, refreshItems, t]);

  return (
    <AdminShell titleKey="admin.jumuahManagement">
      <div className="grid gap-5">
        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
            {copy.friday}
            <select
              value={selectedFriday}
              onChange={(event) => handleFridayChange(event.target.value)}
              disabled={!hasSupabase || isPending || fridayPrayers.length === 0}
              className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
            >
              {fridayPrayers.map((prayer) => <option key={prayer.id} value={prayer.date}>{prayer.date}</option>)}
            </select>
          </label>
          {!selectedPrayer ? <p className="mt-3 text-sm font-semibold text-[var(--color-muted)]">{copy.noFriday}</p> : null}
        </Card>

        {selectedPrayer ? (
          <Card className="border-[var(--color-gold)]/40 bg-[var(--color-emerald-soft)]" data-testid="admin-primary-jumuah" data-locked="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[var(--color-emerald)]">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  <h2 className="text-lg font-extrabold">{copy.primary}</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{copy.primaryHelp}</p>
                <p className="mt-2 text-xs font-bold text-[var(--color-muted)]">{selectedPrayer.date}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">{t("prayer.dhuhr")}</p>
                <p dir="ltr" className="mt-1 text-2xl font-extrabold text-[var(--color-emerald)]">{selectedPrayer.dhuhr}</p>
              </div>
            </div>
          </Card>
        ) : null}

        <Card>
          <h2 className="text-lg font-extrabold text-[var(--color-emerald)]">{editingId ? t("admin.editJumuah") : copy.additional}</h2>
          <p className="mb-4 mt-1 text-sm text-[var(--color-muted)]">{copy.additionalHelp}</p>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { key: "prayerTime", labelKey: "friday.jumuahPrayer", type: "time" },
              { key: "locationName", labelKey: "admin.locationName", type: "text", optional: true },
              { key: "locationAddress", labelKey: "admin.locationAddress", type: "text", optional: true },
              { key: "khateebName", labelKey: "friday.khateeb", type: "text", optional: true },
            ].map(({ key, labelKey, type, optional }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input type={type} required={!optional} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!hasSupabase || isPending || !selectedPrayer} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <LocalizedContentFields
              fields={[
                { base: "language", labelKey: "friday.language" },
                { base: "notes", labelKey: "admin.notes", textarea: true },
              ]}
              form={form}
              setForm={setForm}
              disabled={!hasSupabase || isPending || !selectedPrayer}
            />
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              <input type="checkbox" checked={form.published === "true"} onChange={(event) => setForm((current) => ({ ...current, published: String(event.target.checked) }))} disabled={!hasSupabase || isPending || !selectedPrayer} className="h-5 w-5 accent-[var(--color-emerald)]" />
              {t("admin.published")}
            </label>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending || !selectedPrayer}><Plus className="h-4 w-4" aria-hidden="true" /> {editingId ? t("common.update") : t("common.create")}</Button>
              {editingId ? <Button type="button" variant="ghost" onClick={() => resetForm(selectedFriday)} disabled={isPending}>{t("common.cancel")}</Button> : null}
            </div>
          </form>
        </Card>

        {selectedPrayer ? (
          <JumuahTable
            items={selectedItems}
            primaryTime={selectedPrayer.dhuhr}
            disabled={isPending}
            locale={locale}
            onEdit={fillForm}
            onCorrectLegacy={fillForm}
            onTogglePublish={handleTogglePublish}
            onDelete={handleDelete}
          />
        ) : null}
      </div>
    </AdminShell>
  );
}
