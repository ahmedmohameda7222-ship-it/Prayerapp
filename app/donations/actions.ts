"use server";

import { createServerClient } from "@/lib/supabase/server";

export type ReceiptRequestState = { success: boolean; messageKey?: string };

export async function submitReceiptRequestAction(
  _previous: ReceiptRequestState,
  formData: FormData
): Promise<ReceiptRequestState> {
  const donorName = String(formData.get("donorName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const postalAddress = String(formData.get("postalAddress") || "").trim();
  const donationDate = String(formData.get("donationDate") || "").trim();
  const transferReference = String(formData.get("transferReference") || "").trim();
  const amount = Number(formData.get("amount"));
  const privacyAccepted = formData.get("privacyAccepted") === "on";
  const honeypot = String(formData.get("website") || "");
  const startedAt = Number(formData.get("startedAt"));

  if (honeypot || !startedAt || Date.now() - startedAt < 1500) return { success: false, messageKey: "donations.requestRejected" };
  if (donorName.length < 2 || donorName.length > 120) return { success: false, messageKey: "donations.invalidName" };
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) return { success: false, messageKey: "donations.invalidEmail" };
  if (postalAddress.length < 8 || postalAddress.length > 300) return { success: false, messageKey: "donations.invalidAddress" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(donationDate)) return { success: false, messageKey: "donations.invalidDate" };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return { success: false, messageKey: "donations.invalidAmount" };
  if (!privacyAccepted) return { success: false, messageKey: "donations.privacyRequired" };

  const client = createServerClient();
  if (!client) return { success: false, messageKey: "admin.errors.supabaseNotConfigured" };

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await client
    .from("donation_receipt_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", tenMinutesAgo);
  if ((count || 0) >= 3) return { success: false, messageKey: "donations.tooManyRequests" };

  const { error } = await client.from("donation_receipt_requests").insert({
    donor_name: donorName,
    email,
    postal_address: postalAddress,
    donation_date: donationDate,
    amount,
    transfer_reference: transferReference || null,
    status: "Pending",
    privacy_accepted_at: new Date().toISOString(),
  });
  if (error) return { success: false, messageKey: "donations.requestFailed" };
  return { success: true, messageKey: "donations.requestSent" };
}
