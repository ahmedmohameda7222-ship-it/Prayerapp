import Link from "next/link";
import { BookOpen, CalendarDays, ChevronRight, Compass, HandHeart, Landmark, Moon, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";

const items = [
  ["/donations", "Donations", HandHeart],
  ["/azkar", "Azkar & Duaa", BookOpen],
  ["/ramadan", "Ramadan", Moon],
  ["/events", "Events", CalendarDays],
  ["/mosque", "Mosque Info", Landmark],
  ["/qibla", "Qibla", Compass],
  ["/settings", "Settings", Settings],
] as const;

export default function MorePage() {
  return (
    <AppShell>
      <PageHeader title="More" />
      <div className="grid gap-3">
        {items.map(([href, label, Icon]) => (
          <Link key={href} href={href} className="card flex min-h-16 items-center gap-3 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]">
              <Icon className="h-6 w-6" />
            </div>
            <span className="flex-1 font-bold text-[var(--color-emerald)]">{label}</span>
            <ChevronRight className="h-5 w-5 text-[var(--color-muted)]" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
