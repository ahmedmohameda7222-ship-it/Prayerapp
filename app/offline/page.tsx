import Link from "next/link";

export default function OfflinePage() {
  return <main className="page-shell grid place-items-center"><section className="card max-w-md p-8 text-center"><h1 className="font-brand text-3xl text-[var(--color-emerald)]">You are offline</h1><p className="mt-3 text-[var(--color-muted)]">Reconnect to load the latest prayer times and mosque updates.</p><Link className="mt-5 inline-block rounded-2xl bg-[var(--color-emerald)] px-5 py-3 font-bold text-[var(--color-card)]" href="/">Try again</Link></section></main>;
}
