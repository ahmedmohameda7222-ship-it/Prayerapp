"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getDonationSettings, getDonationCampaigns, getDonations, getDonationReceiptRequests } from "@/lib/data/donations";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { DonationSettings, DonationCampaign, Donation, DonationReceiptRequest } from "@/lib/types";
import {
  updateDonationSettingsAction,
  createDonationCampaignAction,
  updateDonationCampaignAction,
  deleteDonationCampaignAction,
  toggleActiveCampaignAction,
  toggleFeaturedCampaignAction,
} from "./actions";

const emptyCampaignForm = {
  title: "",
  description: "",
  targetAmount: "",
  collectedAmount: "0",
  startDate: "",
  endDate: "",
  isActive: "true",
  isFeatured: "false",
};

export default function AdminDonationsPage() {
  const { session } = useAdminAuth();
  const [, setSettings] = useState<DonationSettings | null>(null);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [, setDonations] = useState<Donation[]>([]);
  const [, setReceipts] = useState<DonationReceiptRequest[]>([]);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [campaignForm, setCampaignForm] = useState<Record<string, string>>({ ...emptyCampaignForm });
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    getDonationSettings().then((s) => {
      setSettings(s);
      setSettingsForm({
        accountHolder: s.accountHolder,
        iban: s.iban,
        bic: s.bic,
        paypalLink: s.paypalLink || "",
        defaultPurpose: s.defaultPurpose,
        receiptNote: s.receiptNote,
      });
    });
    getDonationCampaigns().then((c) => setCampaigns(c));
    getDonations().then((d) => setDonations(d));
    getDonationReceiptRequests().then((r) => setReceipts(r));
  }, []);

  async function handleSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const token = session?.access_token || "";
    if (!token) { setError("Not authenticated."); return; }
    startTransition(async () => {
      const result = await updateDonationSettingsAction(token, settingsForm);
      if (!result.success) setError(result.error || "Failed.");
      else { setSuccess("Settings updated."); const s = await getDonationSettings(); setSettings(s); }
    });
  }

  function resetCampaignForm() { setCampaignForm({ ...emptyCampaignForm }); setEditingCampaignId(null); setError(""); setSuccess(""); }
  function fillCampaignForm(c: DonationCampaign) {
    setCampaignForm({
      title: c.title, description: c.description, targetAmount: String(c.targetAmount),
      collectedAmount: String(c.collectedAmount), startDate: c.startDate, endDate: c.endDate,
      isActive: String(c.isActive), isFeatured: String(c.isFeatured),
    });
    setEditingCampaignId(c.id); setError(""); setSuccess("");
  }

  async function handleCampaignSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    const token = session?.access_token || "";
    if (!token) { setError("Not authenticated."); return; }
    startTransition(async () => {
      const result = editingCampaignId
        ? await updateDonationCampaignAction(token, editingCampaignId, campaignForm)
        : await createDonationCampaignAction(token, campaignForm);
      if (!result.success) setError(result.error || "Failed.");
      else { setSuccess(editingCampaignId ? "Updated." : "Created."); resetCampaignForm(); const c = await getDonationCampaigns(); setCampaigns(c); }
    });
  }

  async function handleDeleteCampaign(id: string) {
    if (!confirm("Delete?")) return; setError("");
    const token = session?.access_token || "";
    startTransition(async () => { const result = await deleteDonationCampaignAction(token, id); if (!result.success) setError(result.error || "Failed."); else { setSuccess("Deleted."); const c = await getDonationCampaigns(); setCampaigns(c); } });
  }
  async function handleToggleActive(id: string, current: boolean) {
    const token = session?.access_token || "";
    startTransition(async () => { const result = await toggleActiveCampaignAction(token, id, !current); if (!result.success) setError(result.error || "Failed."); else { const c = await getDonationCampaigns(); setCampaigns(c); } });
  }
  async function handleToggleFeatured(id: string, current: boolean) {
    const token = session?.access_token || "";
    startTransition(async () => { const result = await toggleFeaturedCampaignAction(token, id, !current); if (!result.success) setError(result.error || "Failed."); else { const c = await getDonationCampaigns(); setCampaigns(c); } });
  }

  return (
    <AdminShell title="Donations Management">
      <div className="grid gap-5">
        {!hasSupabase && <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> Supabase is not configured. Admin editing is disabled.</Card>}
        {error && <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card>}
        {success && <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card>}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">Donation Settings</h2>
          <form onSubmit={handleSettingsSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { k: "accountHolder", l: "Account Holder" }, { k: "iban", l: "IBAN" }, { k: "bic", l: "BIC" },
              { k: "paypalLink", l: "PayPal Link" }, { k: "defaultPurpose", l: "Default Purpose" }, { k: "receiptNote", l: "Receipt Note" },
            ].map(({ k, l }) => (
              <label key={k} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">{l}
                <input type="text" value={settingsForm[k] || ""} onChange={(e) => setSettingsForm((f) => ({ ...f, [k]: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}>Save Settings</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingCampaignId ? "Edit Campaign" : "Create Campaign"}</h2>
          <form onSubmit={handleCampaignSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { k: "title", l: "Title" }, { k: "description", l: "Description" },
              { k: "targetAmount", l: "Target Amount", t: "number" },
              { k: "collectedAmount", l: "Collected Amount", t: "number" },
              { k: "startDate", l: "Start Date", t: "date" },
              { k: "endDate", l: "End Date", t: "date" },
            ].map(({ k, l, t }) => (
              <label key={k} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">{l}
                <input type={t || "text"} required={k !== "endDate" && k !== "description"} value={campaignForm[k]} onChange={(e) => setCampaignForm((f) => ({ ...f, [k]: e.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <div className="flex gap-4 md:col-span-2">
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input type="checkbox" checked={campaignForm.isActive === "true"} onChange={(e) => setCampaignForm((f) => ({ ...f, isActive: String(e.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" /> Active
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input type="checkbox" checked={campaignForm.isFeatured === "true"} onChange={(e) => setCampaignForm((f) => ({ ...f, isFeatured: String(e.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" /> Featured
              </label>
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingCampaignId ? "Update" : "Create"}</Button>
              {editingCampaignId && <Button type="button" variant="ghost" onClick={resetCampaignForm} disabled={isPending}>Cancel</Button>}
            </div>
          </form>
        </Card>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]"><tr>{["Title","Target","Collected","Active","Featured","Actions"].map((h)=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3"><p className="font-bold">{c.title}</p><p className="text-xs text-[var(--color-muted)]">{c.description.slice(0,40)}...</p></td>
                  <td className="px-3 py-3">{c.targetAmount}€</td>
                  <td className="px-3 py-3">{c.collectedAmount}€</td>
                  <td className="px-3 py-3"><button onClick={() => handleToggleActive(c.id, c.isActive)} disabled={isPending} className={`rounded-full px-2 py-1 text-xs font-bold ${c.isActive ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{c.isActive ? "Active" : "Inactive"}</button></td>
                  <td className="px-3 py-3"><button onClick={() => handleToggleFeatured(c.id, c.isFeatured)} disabled={isPending} className={`rounded-full px-2 py-1 text-xs font-bold ${c.isFeatured ? "bg-[var(--color-gold)]/20 text-[var(--color-gold-dark)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{c.isFeatured ? "Featured" : "—"}</button></td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={() => fillCampaignForm(c)} disabled={isPending} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteCampaign(c.id)} disabled={isPending} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="card p-4"><h2 className="font-bold text-[var(--color-emerald)]">Manual Donations & Receipt Requests</h2><p className="mt-2 text-sm text-[var(--color-muted)]">Placeholder — will be connected in a future phase.</p></section>
      </div>
    </AdminShell>
  );
}
