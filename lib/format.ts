import type { Locale } from "@/lib/i18n/types";

const intlLocales: Record<Locale, string> = {
  ar: "ar-DE",
  en: "en-DE",
  de: "de-DE",
  tr: "tr-DE",
};

export function formatCurrency(value: number, locale: Locale = "ar") {
  return new Intl.NumberFormat(intlLocales[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function to12Hour(time: string) {
  const [hoursRaw, minutes] = time.split(":");
  const hours = Number(hoursRaw);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
}

export function percent(collected: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((collected / target) * 100));
}
