import type { Locale } from "@/lib/i18n/types";
import { formatHijriDateParts } from "@/lib/date-utils";

type FormattedHijriDateProps = {
  date: string;
  locale?: Locale;
};

export function FormattedHijriDate({ date, locale = "ar" }: FormattedHijriDateProps) {
  const parts = formatHijriDateParts(date, locale);

  return (
    <span dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      {parts.map((part, index) => (
        <span key={part.type}>
          {index > 0 ? " " : null}
          {part.type === "day" || part.type === "year" ? (
            <bdi data-hijri-part={part.type}>{part.value}</bdi>
          ) : (
            <span data-hijri-part={part.type}>{part.value}</span>
          )}
        </span>
      ))}
    </span>
  );
}
