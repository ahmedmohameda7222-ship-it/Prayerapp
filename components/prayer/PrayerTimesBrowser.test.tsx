import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PrayerTimesBrowser } from "./PrayerTimesBrowser";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";

describe("PrayerTimesBrowser", () => {
  it("keeps range controls usable without synthesizing prayer data", async () => {
    const user = userEvent.setup();
    render(<TimeFormatProvider><PrayerTimesBrowser /></TimeFormatProvider>);

    const week = await screen.findByRole("button", { name: "الأسبوع" });
    expect(week).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("لم يتم نشر مواقيت الصلاة لهذا التاريخ بعد.")).toBeInTheDocument();
    expect(screen.queryByTestId("prayer-preview-notice")).not.toBeInTheDocument();

    const weekRange = screen.getByText(/^\d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}$/);
    expect(weekRange).toHaveAttribute("dir", "ltr");

    const month = screen.getByRole("button", { name: "الشهر" });
    await user.click(month);
    expect(month).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("لم يتم نشر مواقيت الصلاة لهذا التاريخ بعد.")).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}$/)).toHaveAttribute("dir", "ltr");
  });
});
