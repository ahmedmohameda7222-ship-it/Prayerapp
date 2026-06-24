import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";

export function PageHeader({ title, arch = false }: { title: string; arch?: boolean }) {
  if (arch) {
    return (
      <header className="arch-header -mx-4 mb-5 px-4 pb-8 pt-5 text-[var(--color-card)]">
        <div className="relative z-10 grid grid-cols-[44px_1fr_44px] items-center">
          <Link href="/" aria-label="Back home" className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-brand text-center text-3xl font-semibold">{title}</h1>
          <button aria-label="Notifications" className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="mb-5 grid grid-cols-[44px_1fr_44px] items-center">
      <Link href="/" aria-label="Back home" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)]">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="font-brand text-center text-3xl font-semibold text-[var(--color-emerald)]">{title}</h1>
      <button aria-label="Notifications" className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-emerald)]">
        <Bell className="h-5 w-5" />
      </button>
    </header>
  );
}
