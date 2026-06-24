import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { mosqueSettings } from "@/lib/mock-data";

export default function MosquePage() {
  return (
    <AppShell>
      <PageHeader title="Mosque Info" />
      <div className="grid gap-5">
        <Card>
          <h2 className="font-brand text-3xl text-[var(--color-emerald)]">{mosqueSettings.mosqueName}</h2>
          <div className="mt-4 grid gap-3 text-sm font-bold text-[var(--color-charcoal)]">
            <p className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[var(--color-gold-dark)]" /> {mosqueSettings.address}</p>
            <p className="flex items-center gap-2"><Phone className="h-5 w-5 text-[var(--color-gold-dark)]" /> {mosqueSettings.phone}</p>
            <p className="flex items-center gap-2"><Mail className="h-5 w-5 text-[var(--color-gold-dark)]" /> {mosqueSettings.email}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button>Google Maps</Button>
            <Button variant="ghost">WhatsApp</Button>
            <Button variant="ghost">Telegram</Button>
          </div>
        </Card>
        <section>
          <SectionTitle>Facilities</SectionTitle>
          <div className="grid gap-3">
            {["Place for women", "Wudu area", "Parking notes", "Community links"].map((item) => (
              <Card key={item}><p className="font-bold text-[var(--color-emerald)]">{item}</p><p className="mt-1 text-sm text-[var(--color-muted)]">Information placeholder managed by mosque administration.</p></Card>
            ))}
          </div>
        </section>
        <Link href="/donations" className="card block p-4 font-bold text-[var(--color-emerald)]">View bank details on Donations</Link>
      </div>
    </AppShell>
  );
}
