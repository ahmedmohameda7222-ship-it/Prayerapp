import type { DonationReport } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export function TransparencyCard({ report }: { report: DonationReport }) {
  const rows = [
    ["Monthly Need", report.monthlyNeed],
    ["Donations Received", report.donationsReceived],
    ["Remaining", report.remaining],
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="card p-4">
          <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{label}</p>
          <p className="mt-1 text-xl font-extrabold text-[var(--color-emerald)]">{formatCurrency(value as number)}</p>
        </div>
      ))}
    </section>
  );
}
