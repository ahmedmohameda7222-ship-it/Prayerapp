"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getDonationCampaigns, getDonationReceiptRequests, getDonationSettings, getDonations, getDonationReport } from "@/lib/data/donations";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { Donation, DonationCampaign, DonationReceiptRequest, DonationSettings } from "@/lib/types";
import {
  createDonationCampaignAction,
  deleteDonationCampaignAction,
  toggleActiveCampaignAction,
  toggleFeaturedCampaignAction,
  updateDonationCampaignAction,
  updateDonationSettingsAction,
  updateReceiptStatusAction,
  updateDonationReportAction,
} from "./actions";

const emptyCampaignForm = {
  titleAr: "",
  titleEn: "",
  titleDe: "",
  titleTr: "",
  descriptionAr: "",
  descriptionEn: "",
  descriptionDe: "",
  descriptionTr: "",
  targetAmount: "",
  collectedAmount: "0",
  startDate: "",
  endDate: "",
  isActive: "true",
  isFeatured: "false",
};

export default function AdminDonationsPage() {
  const { session } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [, setSettings] = useState<DonationSettings | null>(null);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [, setDonations] = useState<Donation[]>([]);
  const [receipts, setReceipts] = useState<DonationReceiptRequest[]>([]);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [reportForm, setReportForm] = useState<Record<string, string>>({ month: "", monthlyNeed: "0", donationsReceived: "0" });
  const [campaignForm, setCampaignForm] = useState<Record<string, string>>({ ...emptyCampaignForm });
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();

  useEffect(() => {
    getDonationSettings().then((settings) => {
      setSettings(settings);
      setSettingsForm({
        accountHolder: settings.accountHolder,
        iban: settings.iban,
        bic: settings.bic,
        paypalLink: settings.paypalLink || "",
        defaultPurposeAr: settings.defaultPurposeAr || settings.defaultPurpose,
        defaultPurposeEn: settings.defaultPurposeEn || "",
        defaultPurposeDe: settings.defaultPurposeDe || "",
        defaultPurposeTr: settings.defaultPurposeTr || "",
        receiptNoteAr: settings.receiptNoteAr || settings.receiptNote,
        receiptNoteEn: settings.receiptNoteEn || "",
        receiptNoteDe: settings.receiptNoteDe || "",
        receiptNoteTr: settings.receiptNoteTr || "",
      });
    }).catch(() => setError(t("common.dataLoadFailed")));
    getDonationCampaigns(true).then((data) => setCampaigns(data)).catch(() => setError(t("common.dataLoadFailed")));
    getDonations().then((data) => setDonations(data)).catch(() => setError(t("common.dataLoadFailed")));
    getDonationReceiptRequests().then((data) => setReceipts(data)).catch(() => setError(t("common.dataLoadFailed")));
    getDonationReport().then((report) => setReportForm({ month: report.month, monthlyNeed: String(report.monthlyNeed), donationsReceived: String(report.donationsReceived) })).catch(() => setError(t("common.dataLoadFailed")));
  }, [t]);

  function handleReceiptStatus(id: string, status: string) {
    const token = session?.access_token || "";
    if (!token) return setError(t("admin.errors.notAuthenticated"));
    startTransition(async () => {
      const result = await updateReceiptStatusAction(token, id, status);
      if (!result.success) return setError(t(result.error || "admin.errors.saveFailed"));
      setReceipts(await getDonationReceiptRequests());
      setSuccess(t("admin.messages.updated"));
    });
  }

  function handleReportSubmit(event: React.FormEvent) {
    event.preventDefault();
    const token = session?.access_token || "";
    if (!token) return setError(t("admin.errors.notAuthenticated"));
    startTransition(async () => {
      const result = await updateDonationReportAction(token, reportForm);
      if (!result.success) return setError(t(result.error || "admin.errors.saveFailed"));
      setSuccess(t("admin.messages.settingsUpdated"));
    });
  }

  async function handleSettingsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const token = session?.access_token || "";
    if (!token) {
      setError(t("admin.errors.notAuthenticated"));
      return;
    }
    startTransition(async () => {
      const result = await updateDonationSettingsAction(token, settingsForm);
      if (!result.success) setError(t(result.error || "admin.errors.saveFailed"));
      else {
        setSuccess(t("admin.messages.settingsUpdated"));
        setSettings(await getDonationSettings());
      }
    });
  }

  function resetCampaignForm() {
    setCampaignForm({ ...emptyCampaignForm });
    setEditingCampaignId(null);
    setError("");
  }

  function fillCampaignForm(campaign: DonationCampaign) {
    setCampaignForm({
      titleAr: campaign.titleAr || campaign.title,
      titleEn: campaign.titleEn || "",
      titleDe: campaign.titleDe || "",
      titleTr: campaign.titleTr || "",
      descriptionAr: campaign.descriptionAr || campaign.description,
      descriptionEn: campaign.descriptionEn || "",
      descriptionDe: campaign.descriptionDe || "",
      descriptionTr: campaign.descriptionTr || "",
      targetAmount: String(campaign.targetAmount),
      collectedAmount: String(campaign.collectedAmount),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      isActive: String(campaign.isActive),
      isFeatured: String(campaign.isFeatured),
    });
    setEditingCampaignId(campaign.id);
    setError("");
    setSuccess("");
  }

  async function refreshCampaigns() {
    setCampaigns(await getDonationCampaigns(true));
  }

  async function handleCampaignSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const token = session?.access_token || "";
    if (!token) {
      setError(t("admin.errors.notAuthenticated"));
      return;
    }
    startTransition(async () => {
      const result = editingCampaignId
        ? await updateDonationCampaignAction(token, editingCampaignId, campaignForm)
        : await createDonationCampaignAction(token, campaignForm);
      if (!result.success) {
        setError(t(result.error || "admin.errors.saveFailed"));
        return;
      }
      resetCampaignForm();
      setSuccess(t(editingCampaignId ? "admin.messages.updated" : "admin.messages.created"));
      await refreshCampaigns();
    });
  }

  async function handleDeleteCampaign(id: string) {
    if (!confirm(t("admin.confirmDeleteCampaign"))) return;
    setError("");
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await deleteDonationCampaignAction(token, id);
      if (!result.success) setError(t(result.error || "admin.errors.deleteFailed"));
      else {
        setSuccess(t("admin.messages.deleted"));
        await refreshCampaigns();
      }
    });
  }

  async function handleToggleActive(id: string, current: boolean) {
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await toggleActiveCampaignAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshCampaigns();
    });
  }

  async function handleToggleFeatured(id: string, current: boolean) {
    const token = session?.access_token || "";
    startTransition(async () => {
      const result = await toggleFeaturedCampaignAction(token, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshCampaigns();
    });
  }

  return (
    <AdminShell titleKey="admin.donationsManagement">
      <div className="grid gap-5">
        {!hasSupabase ? <Card className="flex items-center gap-3 p-4 text-sm font-bold text-[var(--color-warning)]"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> {t("admin.supabaseNotConfigured")}</Card> : null}
        {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
        {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{t("admin.donationSettings")}</h2>
          <form onSubmit={handleSettingsSubmit} className="grid gap-4 md:grid-cols-2">
            {[
              { key: "accountHolder", labelKey: "donations.accountHolder" },
              { key: "iban", labelKey: "donations.iban" },
              { key: "bic", labelKey: "donations.bic" },
              { key: "paypalLink", labelKey: "admin.paypalLink" },
            ].map(({ key, labelKey }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input type="text" value={settingsForm[key] || ""} onChange={(event) => setSettingsForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <LocalizedContentFields
              fields={[
                { base: "defaultPurpose", labelKey: "admin.defaultPurpose", requiredArabic: true },
                { base: "receiptNote", labelKey: "admin.receiptNote", textarea: true },
              ]}
              form={settingsForm}
              setForm={setSettingsForm}
              disabled={!hasSupabase || isPending}
            />
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}>{t("admin.saveSettings")}</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{t("admin.donationReport")}</h2>
          <form onSubmit={handleReportSubmit} className="grid gap-3 md:grid-cols-3">
            {[{ key: "month", type: "month", label: "admin.month" }, { key: "monthlyNeed", type: "number", label: "donations.monthlyNeed" }, { key: "donationsReceived", type: "number", label: "donations.received" }].map((field) => <label key={field.key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">{t(field.label)}<input required min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? "0.01" : undefined} type={field.type} value={reportForm[field.key] || ""} onChange={(event) => setReportForm((current) => ({ ...current, [field.key]: event.target.value }))} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3" /></label>)}
            <div className="md:col-span-3"><Button type="submit" disabled={isPending}>{t("common.save")}</Button></div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{editingCampaignId ? t("admin.editCampaign") : t("admin.createCampaign")}</h2>
          <form onSubmit={handleCampaignSubmit} className="grid gap-4 md:grid-cols-2">
            <LocalizedContentFields
              fields={[
                { base: "title", labelKey: "admin.title", requiredArabic: true },
                { base: "description", labelKey: "admin.description", textarea: true, requiredArabic: true },
              ]}
              form={campaignForm}
              setForm={setCampaignForm}
              disabled={!hasSupabase || isPending}
            />
            {[
              { key: "targetAmount", labelKey: "admin.targetAmount", type: "number" },
              { key: "collectedAmount", labelKey: "admin.collectedAmount", type: "number" },
              { key: "startDate", labelKey: "admin.startDate", type: "date" },
              { key: "endDate", labelKey: "admin.endDate", type: "date", optional: true },
            ].map(({ key, labelKey, type, optional }) => (
              <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                {t(labelKey)}
                <input type={type} required={!optional} value={campaignForm[key]} onChange={(event) => setCampaignForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!hasSupabase || isPending} className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50" />
              </label>
            ))}
            <div className="flex flex-wrap gap-4 md:col-span-2">
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input type="checkbox" checked={campaignForm.isActive === "true"} onChange={(event) => setCampaignForm((current) => ({ ...current, isActive: String(event.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" /> {t("admin.active")}
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]">
                <input type="checkbox" checked={campaignForm.isFeatured === "true"} onChange={(event) => setCampaignForm((current) => ({ ...current, isFeatured: String(event.target.checked) }))} disabled={!hasSupabase || isPending} className="h-5 w-5 accent-[var(--color-emerald)]" /> {t("admin.featured")}
              </label>
            </div>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={!hasSupabase || isPending}><Plus className="h-4 w-4" aria-hidden="true" /> {editingCampaignId ? t("common.update") : t("common.create")}</Button>
              {editingCampaignId ? <Button type="button" variant="ghost" onClick={resetCampaignForm} disabled={isPending}>{t("common.cancel")}</Button> : null}
            </div>
          </form>
        </Card>

        <div className="overflow-x-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--color-emerald)] text-[var(--color-card)]"><tr>{["admin.title", "donations.target", "donations.collected", "admin.active", "admin.featured", "admin.actions"].map((key) => <th key={key} className="px-3 py-3">{t(key)}</th>)}</tr></thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3"><p className="font-bold">{getLocalizedField(campaign, "title", locale)}</p><p className="text-xs text-[var(--color-muted)]">{getLocalizedField(campaign, "description", locale).slice(0, 40)}...</p></td>
                  <td className="px-3 py-3">{campaign.targetAmount}€</td>
                  <td className="px-3 py-3">{campaign.collectedAmount}€</td>
                  <td className="px-3 py-3"><button onClick={() => handleToggleActive(campaign.id, campaign.isActive)} disabled={isPending} className={`rounded-full px-2 py-1 text-xs font-bold ${campaign.isActive ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{campaign.isActive ? t("admin.active") : t("admin.inactive")}</button></td>
                  <td className="px-3 py-3"><button onClick={() => handleToggleFeatured(campaign.id, campaign.isFeatured)} disabled={isPending} className={`rounded-full px-2 py-1 text-xs font-bold ${campaign.isFeatured ? "bg-[var(--color-gold)]/20 text-[var(--color-gold-dark)]" : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"}`}>{campaign.isFeatured ? t("admin.featured") : "-"}</button></td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={() => fillCampaignForm(campaign)} disabled={isPending} aria-label={t("common.edit")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteCampaign(campaign.id)} disabled={isPending} aria-label={t("common.delete")} className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="card overflow-x-auto p-4">
          <h2 className="mb-3 font-bold text-[var(--color-emerald)]">{t("admin.manualDonationsReceipts")}</h2>
          {!receipts.length ? <p className="text-sm text-[var(--color-muted)]">{t("admin.noReceiptRequests")}</p> : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr>{["donations.donorName", "donations.amount", "donations.donationDate", "donations.email", "admin.status"].map((key) => <th key={key} className="px-3 py-2">{t(key)}</th>)}</tr></thead>
              <tbody>{receipts.map((receipt) => <tr key={receipt.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-3"><p className="font-bold">{receipt.donorName}</p><p className="max-w-[240px] text-xs text-[var(--color-muted)]">{receipt.postalAddress}</p></td>
                <td className="px-3 py-3">{receipt.amount} €</td>
                <td className="px-3 py-3">{receipt.donationDate || "-"}</td>
                <td className="px-3 py-3">{receipt.email}</td>
                <td className="px-3 py-3"><select value={receipt.status} disabled={isPending} onChange={(event) => handleReceiptStatus(receipt.id, event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-cream)] px-2 py-2"><option>Pending</option><option>Reviewed</option><option>Sent</option></select></td>
              </tr>)}</tbody>
            </table>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
