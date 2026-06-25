"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/use-translation";

const amounts = ["€5", "€10", "€20", "€50"];

export function QuickDonateButtons() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState("€20");
  const options = [...amounts, t("donations.customAmount")];

  return (
    <div className="grid grid-cols-5 gap-2">
      {options.map((amount) => (
        <button
          key={amount}
          onClick={() => setSelected(amount)}
          className={`min-h-12 rounded-2xl border px-2 text-sm font-extrabold transition ${
            selected === amount ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-emerald-dark)]" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)]"
          }`}
        >
          {amount}
        </button>
      ))}
    </div>
  );
}
