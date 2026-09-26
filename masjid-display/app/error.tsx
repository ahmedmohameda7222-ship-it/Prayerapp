"use client";

export default function DisplayError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="display-error-shell" role="alert">
      <h1>Display temporarily unavailable</h1>
      <p>تعذر عرض الشاشة مؤقتًا</p>
      <button type="button" onClick={reset}>
        Retry / إعادة المحاولة
      </button>
    </main>
  );
}
