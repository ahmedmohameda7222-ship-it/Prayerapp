"use client";

import { useState, useEffect, useTransition } from "react";
import { Save, AlertTriangle } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { MosqueSettings } from "@/lib/types";
import { updateMosqueSettingsAction } from "./actions";

export default function AdminSettingsPage() {
  const { session } = useAdminAuth();
  const [, setSettings] = useState<MosqueSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    getMosqueSettings().then((s) => {
      setSettings(s);
      setForm({
        mosqueName: s.mosqueName,
        address: s.address,
        phone: s.phone,
        email: s.email,
        googleMapsLink: s.googleMapsLink,
        whatsappLink: s.whatsappLink,
        telegramLink: s.telegramLink,
        accountHolder: s.accountHolder,
        iban: s.iban,
        bic: s.bic,
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    const token = session?.access_token || "";
    if (!token) { setError("Not authenticated."); return; }
    startTransition(async () => {
      const result = await updateMosqueSettingsAction(token, form);
      if (!result.success) setError(result.error || "Failed.");
      else { setSuccess("Settings updated."); setSettings(await getMosqueSettings()); }
    });
  }

  const fields = [
    { k: "mosqueName", l: "Mosque Name" }, { k: "address", l: "Address" }, { k: "phone", l: "Phone" },
    { k: "email", l: "Email" }, { k: "googleMapsLink", l: "Google Maps Link" },
    { k: "whatsappLink", l: "WhatsApp Link" }, { k: "telegramLink", l: "Telegram Link" },
    { k: "accountHolder", l: "Account Holder" }, { k: "iban", l: "IBAN" }, { k: "bic", l: "BIC" },
  ];

  return (
    <AdminShell title="App Settings">
      <div className="grid gap-5">
        {!hasSupabase && <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> Supabase is not configured. Admin editing is disabled.</Card>}
        {error && <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card>}
        {success && <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card>}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">Mosque Settings</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {fields.map(({ k, l }) => (
              <label key={k} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">{l}
                <input type="text" required={k === "mosqueName" || k === "address"} value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Save className="h-4 w-4" aria-hidden="true" /> Save Settings</Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
