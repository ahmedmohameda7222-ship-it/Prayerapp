"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/context";

const COPY = {
  ar: "غير متصل بالإنترنت — يتم عرض المواقيت والصفحات المحفوظة. يلزم الاتصال للتحديث.",
  en: "Offline — showing saved prayer times and pages. Reconnect for updates.",
  de: "Offline — gespeicherte Gebetszeiten und Seiten werden angezeigt. Für Updates verbinden.",
  tr: "Çevrimdışı — kaydedilen namaz vakitleri ve sayfalar gösteriliyor. Güncellemeler için bağlanın.",
} as const;

export function OfflineStatusBanner() {
  const { locale } = useLocale();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", offline);
    };
    function offline() { setOnline(false); }
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-lg rounded-xl border border-[#e3cf9b] bg-[#fff8e6] px-4 py-3 text-center text-sm font-semibold leading-6 text-[#59461b] shadow-md"
    >
      {COPY[locale]}
    </div>
  );
}
