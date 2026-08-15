import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="system-state-screen">
      <section>
        <WifiOff className="mx-auto h-8 w-8 text-[#005a52]" aria-hidden="true" />
        <h1>You are offline</h1>
        <p>Reconnect to load the latest prayer times and mosque updates.</p>
        <Link href="/">Try again</Link>
      </section>
    </main>
  );
}
