"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application route error", error); }, [error]);

  return (
    <main className="system-state-screen">
      <section>
        <AlertCircle className="mx-auto h-8 w-8 text-[#005a52]" aria-hidden="true" />
        <h1>Something went wrong</h1>
        <p>The latest data could not be displayed. Please try again.</p>
        <button type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
