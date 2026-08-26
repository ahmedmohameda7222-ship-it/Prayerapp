import { notFound } from "next/navigation";
import { FridayKhutbahReader } from "@/components/friday/FridayKhutbahReader";
import { AppShell } from "@/components/layout/AppShell";
import { RootPageHeader } from "@/components/layout/RootPageHeader";
import { getFridayKhutbahByDate } from "@/lib/data/friday-khutbahs";
import { isFridayIso } from "@/lib/friday";

export default async function FridayKhutbahPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFridayIso(date)) notFound();

  const khutbah = await getFridayKhutbahByDate(date);
  if (!khutbah) notFound();

  return (
    <AppShell surface="home">
      <RootPageHeader titleKey="friday.title" />
      <FridayKhutbahReader khutbah={khutbah} />
    </AppShell>
  );
}
