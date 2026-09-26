"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { MosqueSettings } from "@/lib/types";
import { updateMosqueSettingsAction } from "./actions";

export default function AdminSettingsPage() {
  const { session } = useAdminAuth();
  const { t } = useTranslation();
  const [, setSettings] = useState<MosqueSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    getMosqueSettings().then((settings) => {
      setSettings(settings);
      setForm({
        mosqueNameAr: settings.mosqueNameAr || settings.mosqueName,
        mosqueNameEn: settings.mosqueNameEn || "",
        mosqueNameDe: settings.mosqueNameDe || "",
        mosqueNameTr: settings.mosqueNameTr || "",
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        googleMapsLink: settings.googleMapsLink,
        whatsappLink: settings.whatsappLink,
        accountHolder: settings.accountHolder,
        iban: settings.iban,
        bic: settings.bic,
        publicAppUrl: settings.publicAppUrl || "",
      });
    });
  }, []);

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
      const result = await updateMosqueSettingsAction(token, form);
      if (!result.success) setError(t(result.error || "admin.errors.saveFailed"));
      else {
        setSuccess(t("admin.messages.settingsUpdated"));
        setSettings(await getMosqueSettings());
      }
    });
  }

  const fields = [
    { key: "address", labelKey: "admin.address", required: true, type: "text" },
    { key: "phone", labelKey: "admin.phone", type: "text" },
    { key: "email", labelKey: "admin.email", type: "email" },
    { key: "googleMapsLink", labelKey: "admin.googleMapsLink", type: "url" },
    { key: "whatsappLink", labelKey: "admin.whatsappLink", type: "url" },
    { key: "accountHolder", labelKey: "donations.accountHolder", type: "text" },
    { key: "iban", labelKey: "donations.iban", type: "text" },
    { key: "bic", labelKey: "donations.bic", type: "text" },
  ];

  return (
    <AdminShell titleKey="admin.appSettings">
      <div className="grid gap-5">
        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{t("admin.mosqueSettings")}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <LocalizedContentFields fields={[{ base: "mosqueName", labelKey: "admin.mosqueName", requiredArabic: true }]} form={form} setForm={setForm} disabled={!hasSupabase || isPending} />
            {fields.map(({ key, labelKey, required, type }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input type={type} required={required} value={form[key] || ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)] md:col-span-2">
              Prayerapp public URL
              <input
                type="url"
                name="publicAppUrl"
                required
                value={form.publicAppUrl || ""}
                onChange={(event) => setForm((current) => ({ ...current, publicAppUrl: event.target.value }))}
                disabled={!hasSupabase || isPending}
                placeholder="https://prayer.example/"
                className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
              />
              <span className="text-xs font-normal text-[var(--color-muted)]">Used by the Masjid TV QR code and Test Control. Production URLs must use HTTPS.</span>
            </label>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Save className="h-4 w-4" aria-hidden="true" /> {t("admin.saveSettings")}</Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
