import { Info } from "lucide-react";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card flex items-start gap-3 p-4 text-[var(--color-muted)]">
      <Info className="mt-0.5 h-5 w-5 text-[var(--color-gold-dark)]" />
      <p className="text-sm leading-6">{message}</p>
    </div>
  );
}
