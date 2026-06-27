"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { DonationCampaignsTable } from "@/components/admin/DonationCampaignsTable";
import { LocalizedContentFields } from "@/components/admin/LocalizedContentFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getDonationCampaigns, getDonationSettings, getDonations, getDonationReport } from "@/lib/data/donations";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Donation, DonationCampaign, DonationSettings } from "@/lib/types";
import {
  createDonationCampaignAction,
  deleteDonationCampaignAction,
  toggleActiveCampaignAction,
  toggleFeaturedCampaignAction,
  updateDonationCampaignAction,
  updateDonationSettingsAction,
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
  const { t } = useTranslation();
  const [, setSettings] = useState<DonationSettings | null>(null);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [, setDonations] = useState<Donation[]>([]);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [reportForm, setReportForm] = useState<Record<string, string>>({ month: "", monthlyNeed: "0", donationsReceived: "0" });
  const [campaignForm, setCampaignForm] = useState<Record<string, string>>({ ...emptyCampaignForm });
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSupabase = !!createClient();
  const accessToken = session?.access_token || "";

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
      });
    }).catch(() => setError(t("common.dataLoadFailed")));
    getDonationCampaigns(true).then((data) => setCampaigns(data)).catch(() => setError(t("common.dataLoadFailed")));
    getDonations().then((data) => setDonations(data)).catch(() => setError(t("common.dataLoadFailed")));
    getDonationReport().then((report) => setReportForm({ month: report.month, monthlyNeed: String(report.monthlyNeed), donationsReceived: String(report.donationsReceived) })).catch(() => setError(t("common.dataLoadFailed")));
  }, [t]);

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

  const fillCampaignForm = useCallback((campaign: DonationCampaign) => {
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
  }, []);

  const refreshCampaigns = useCallback(async () => {
    setCampaigns(await getDonationCampaigns(true));
  }, []);

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

  const handleDeleteCampaign = useCallback(async (id: string) => {
    if (!confirm(t("admin.confirmDeleteCampaign"))) return;
    setError("");
    startTransition(async () => {
      const result = await deleteDonationCampaignAction(accessToken, id);
      if (!result.success) setError(t(result.error || "admin.errors.deleteFailed"));
      else {
        setSuccess(t("admin.messages.deleted"));
        await refreshCampaigns();
      }
    });
  }, [accessToken, refreshCampaigns, t]);

  const handleToggleActive = useCallback(async (id: string, current: boolean) => {
    startTransition(async () => {
      const result = await toggleActiveCampaignAction(accessToken, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshCampaigns();
    });
  }, [accessToken, refreshCampaigns, t]);

  const handleToggleFeatured = useCallback(async (id: string, current: boolean) => {
    startTransition(async () => {
      const result = await toggleFeaturedCampaignAction(accessToken, id, !current);
      if (!result.success) setError(t(result.error || "admin.errors.toggleFailed"));
      else await refreshCampaigns();
    });
  }, [accessToken, refreshCampaigns, t]);

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

        <DonationCampaignsTable campaigns={campaigns} disabled={isPending} onEdit={fillCampaignForm} onDelete={handleDeleteCampaign} onToggleActive={handleToggleActive} onToggleFeatured={handleToggleFeatured} />
      </div>
    </AdminShell>
  );
}
