"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application route error", error); }, [error]);
  return <main className="page-shell grid place-items-center"><section className="card max-w-md p-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-[var(--color-danger)]" /><h1 className="mt-3 font-brand text-3xl text-[var(--color-emerald)]">Something went wrong</h1><p className="mt-2 text-sm text-[var(--color-muted)]">The latest data could not be displayed. Please try again.</p><button type="button" onClick={reset} className="mt-5 rounded-2xl bg-[var(--color-emerald)] px-5 py-3 font-bold text-[var(--color-card)]">Try again</button></section></main>;
}
