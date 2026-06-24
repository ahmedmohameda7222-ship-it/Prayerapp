import { AlertTriangle } from "lucide-react";

export function WarningCard({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-[rgba(212,175,55,0.45)] bg-[#fff9e8] p-4 text-[var(--color-gold-dark)] shadow-[var(--shadow-soft)]">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-bold leading-6">{message}</p>
      </div>
    </div>
  );
}
