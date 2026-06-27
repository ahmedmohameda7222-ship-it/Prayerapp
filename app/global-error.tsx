"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("Application fatal error", error);
  return <html><body><main style={{ padding: 32, fontFamily: "sans-serif" }}><h1>Masjid El-Rahman could not load</h1><p>Please refresh or try again shortly.</p><button onClick={reset}>Try again</button></main></body></html>;
}
