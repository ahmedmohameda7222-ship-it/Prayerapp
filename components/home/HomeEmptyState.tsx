import { Info } from "lucide-react";

export function HomeEmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] bg-[var(--home-surface-subtle)] p-4 text-[var(--home-text-secondary)]">
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-[15px] leading-6">{message}</p>
    </div>
  );
}
