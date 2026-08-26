import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormattedHijriDate } from "@/components/ui/FormattedHijriDate";
import { formatHijriDateParts } from "@/lib/date-utils";

describe("FormattedHijriDate", () => {
  it("returns Arabic Umm al-Qura parts in explicit day-month-year-era order", () => {
    const parts = formatHijriDateParts("2026-08-26", "ar");

    expect(parts.map((part) => part.type)).toEqual(["day", "month", "year", "era"]);
    expect(parts[0]?.value).toMatch(/[٠-٩]/);
    expect(parts[2]?.value).toMatch(/[٠-٩]/);
    expect(parts[3]?.value).toContain("هـ");
  });

  it("renders numeric Arabic Hijri parts in bidi-isolated DOM order", () => {
    const html = renderToStaticMarkup(<FormattedHijriDate date="2026-08-26" locale="ar" />);
    const day = html.indexOf('data-hijri-part="day"');
    const month = html.indexOf('data-hijri-part="month"');
    const year = html.indexOf('data-hijri-part="year"');
    const era = html.indexOf('data-hijri-part="era"');

    expect(html).toContain("<bdi");
    expect(day).toBeGreaterThan(-1);
    expect(month).toBeGreaterThan(day);
    expect(year).toBeGreaterThan(month);
    expect(era).toBeGreaterThan(year);
  });
});
