"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { submitReceiptRequestAction, type ReceiptRequestState } from "@/app/donations/actions";
import { useTranslation } from "@/lib/i18n/use-translation";

const initialState: ReceiptRequestState = { success: false };

export function ReceiptRequestForm() {
  const { t } = useTranslation();
  const [state, action, pending] = useActionState(submitReceiptRequestAction, initialState);
  const [startedAt] = useState(() => Date.now());
  const fieldClass = "min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 outline-none focus:border-[var(--color-gold)]";

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="startedAt" value={startedAt} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={fieldClass} name="donorName" required maxLength={120} placeholder={t("donations.donorName")} />
        <input className={fieldClass} name="email" type="email" required maxLength={160} placeholder={t("donations.email")} />
        <input className={fieldClass} name="amount" type="number" min="0.01" max="1000000" step="0.01" required placeholder={t("donations.amount")} />
        <input className={fieldClass} name="donationDate" type="date" required aria-label={t("donations.donationDate")} />
        <input className={`${fieldClass} sm:col-span-2`} name="postalAddress" required maxLength={300} placeholder={t("donations.postalAddress")} />
        <input className={`${fieldClass} sm:col-span-2`} name="transferReference" maxLength={160} placeholder={t("donations.transferReference")} />
      </div>
      <label className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
        <input className="mt-1 h-4 w-4 accent-[var(--color-emerald)]" type="checkbox" name="privacyAccepted" required />
        <span>{t("donations.privacyConsent")} <Link className="font-bold text-[var(--color-emerald)] underline" href="/privacy">{t("common.privacy")}</Link></span>
      </label>
      {state.messageKey ? <p role="status" className={`text-sm font-bold ${state.success ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{t(state.messageKey)}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? t("common.loading") : t("donations.submitRequest")}</Button>
    </form>
  );
}
