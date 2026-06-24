import { Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function QiblaPage() {
  return (
    <AppShell>
      <PageHeader title="Qibla" />
      <Card className="py-12 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]">
          <Compass className="h-10 w-10" />
        </div>
        <h2 className="font-brand text-3xl text-[var(--color-emerald)]">Qibla</h2>
        <p className="mt-3 text-[var(--color-muted)]">Qibla direction feature will be added soon.</p>
      </Card>
    </AppShell>
  );
}
