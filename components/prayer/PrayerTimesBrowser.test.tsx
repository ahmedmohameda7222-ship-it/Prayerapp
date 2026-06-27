import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PrayerTimesBrowser } from "./PrayerTimesBrowser";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";

describe("PrayerTimesBrowser", () => {
  it("switches ranges and moves to another week", async () => {
    const user = userEvent.setup();
    render(<TimeFormatProvider><PrayerTimesBrowser /></TimeFormatProvider>);
    const week = await screen.findByRole("button", { name: "الأسبوع" });
    expect(week).toHaveAttribute("aria-pressed", "true");
    const previous = screen.getByRole("button", { name: "السابق" });
    await user.click(previous);
    expect(await screen.findByText("لم يتم نشر مواقيت الصلاة لهذا التاريخ بعد.")).toBeInTheDocument();
    const month = screen.getByRole("button", { name: "الشهر" });
    await user.click(month);
    expect(month).toHaveAttribute("aria-pressed", "true");
  });
});
