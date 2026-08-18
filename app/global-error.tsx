"use client";

import { APP_NAMES } from "@/lib/app-brand";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("Application fatal error", error);

  return (
    <html>
      <body style={{ margin: 0, background: "#f7f3ea", color: "#171a18", fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(100%, 420px)", textAlign: "center" }}>
            <div aria-hidden="true" style={{ width: 38, height: 38, margin: "0 auto", borderRadius: "50%", background: "#e7f0ec", color: "#005a52", display: "grid", placeItems: "center", fontWeight: 800 }}>!</div>
            <h1 style={{ margin: "14px 0 0", fontSize: 27, lineHeight: 1.2 }}>{APP_NAMES.en} could not load</h1>
            <p style={{ margin: "8px 0 0", color: "#626761", fontSize: 14, lineHeight: 1.65 }}>Please refresh or try again shortly.</p>
            <button type="button" onClick={reset} style={{ minHeight: 48, marginTop: 20, border: 0, borderRadius: 14, background: "#005a52", color: "#fffdf8", padding: "0 18px", font: "inherit", fontWeight: 700 }}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
