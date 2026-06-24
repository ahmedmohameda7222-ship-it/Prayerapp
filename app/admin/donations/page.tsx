import { AdminShell } from "@/components/layout/AdminShell";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { AdminTable } from "@/components/admin/AdminTable";
import { FormField } from "@/components/admin/FormField";
import { donationCampaigns, donations, donationSettings, receiptRequests } from "@/lib/mock-data";

export default function AdminDonationsPage() {
  const campaign = donationCampaigns[0];
  return (
    <AdminShell title="Donations Management">
      <div className="grid gap-5">
        <AdminFormSection title="Donation Settings">
          <FormField label="account_holder" value={donationSettings.accountHolder} />
          <FormField label="iban" value={donationSettings.iban} />
          <FormField label="bic" value={donationSettings.bic} />
          <FormField label="paypal_link" value={donationSettings.paypalLink} />
          <FormField label="default_purpose" value={donationSettings.defaultPurpose} />
          <FormField label="receipt_note" value={donationSettings.receiptNote} />
        </AdminFormSection>
        <AdminFormSection title="Campaigns">
          <FormField label="title" value={campaign.title} />
          <FormField label="description" value={campaign.description} />
          <FormField label="target_amount" value={campaign.targetAmount} type="number" />
          <FormField label="collected_amount" value={campaign.collectedAmount} type="number" />
          <FormField label="start_date" value={campaign.startDate} type="date" />
          <FormField label="end_date" value={campaign.endDate} type="date" />
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]"><input type="checkbox" defaultChecked className="h-5 w-5 accent-[var(--color-emerald)]" /> is_active</label>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold text-[var(--color-emerald)]"><input type="checkbox" defaultChecked className="h-5 w-5 accent-[var(--color-emerald)]" /> is_featured</label>
        </AdminFormSection>
        <AdminTable headers={["Manual donations", "Amount", "Purpose", "Method"]} rows={donations.map((item) => [item.receivedAt, item.amount, item.purpose, item.method])} />
        <AdminTable headers={["Receipt request", "Amount", "Email", "Status"]} rows={receiptRequests.map((item) => [item.donorName, item.amount, item.email, item.status])} />
        <section className="card p-4">
          <h2 className="font-bold text-[var(--color-emerald)]">Reports placeholder</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Donation reports will be generated from future backend data.</p>
        </section>
      </div>
    </AdminShell>
  );
}
