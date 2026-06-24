"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { DonationSettings } from "@/lib/types";
import { Card } from "@/components/ui/Card";

export function BankTransferCard({ settings }: { settings: DonationSettings }) {
  const [copied, setCopied] = useState("");
  const rows = [
    ["Account holder", settings.accountHolder],
    ["IBAN", settings.iban],
    ["BIC", settings.bic],
    ["Reference / Verwendungszweck", settings.defaultPurpose],
  ];

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied("Copy unavailable");
    }
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--color-emerald)]">Bank Transfer</h2>
      <div className="grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[1fr_44px] gap-3 rounded-2xl bg-[var(--color-cream)] p-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-muted)]">{label}</p>
              <p className="break-words font-bold text-[var(--color-charcoal)]">{value}</p>
            </div>
            <button aria-label={`Copy ${label}`} onClick={() => copy(label, value)} className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-emerald)] text-[var(--color-card)]">
              {copied === label ? <Check className="h-5 w-5 text-[var(--color-gold)]" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
