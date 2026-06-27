import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n/context";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";
import type { PrayerTime } from "@/lib/types";
import { PrayerTimesCard } from "./PrayerTimesCard";

const prayer: PrayerTime = {
  id: "test-prayer",
  date: "2026-06-28",
  fajr: "03:13",
  sunrise: "05:03",
  dhuhr: "13:12",
  asr: "17:28",
  maghrib: "21:14",
  isha: "22:57",
  fajrIqama: "03:45",
  published: true,
  updatedAt: "2026-06-28T00:00:00.000Z",
};

function renderCard(value: PrayerTime) {
  render(
    <I18nProvider initialLocale="en">
      <TimeFormatProvider>
        <PrayerTimesCard prayer={value} />
      </TimeFormatProvider>
    </I18nProvider>,
  );
}

describe("PrayerTimesCard display settings", () => {
  it("shows configured jamaah rows while preserving the official Isha azan", () => {
    renderCard({
      ...prayer,
      maghribProgram: {
        enabled: true,
        maghribIqamaTime: "21:20",
        lessonTitle: "Tafsir",
        lessonDurationMinutes: 10,
        combinedIshaTime: "21:35",
      },
    });

    expect(screen.getByText("Salat Fajr")).toBeInTheDocument();
    expect(screen.getByText("Salat Maghrib")).toBeInTheDocument();
    expect(screen.getByText("Tafsir · 10 min")).toBeInTheDocument();
    expect(screen.getByText("Salat Isha")).toBeInTheDocument();
    expect(screen.getByText("Azan Isha")).toBeInTheDocument();
    expect(screen.getByText("22:57")).toBeInTheDocument();
  });

  it("hides the optional Maghrib program when disabled", () => {
    renderCard({
      ...prayer,
      maghribProgram: {
        enabled: false,
        maghribIqamaTime: "21:20",
        lessonTitle: "Tafsir",
        lessonDurationMinutes: 10,
        combinedIshaTime: "21:35",
      },
    });

    expect(screen.queryByText("Salat Maghrib")).not.toBeInTheDocument();
    expect(screen.queryByText("Salat Isha")).not.toBeInTheDocument();
    expect(screen.getByText("Azan Isha")).toBeInTheDocument();
  });
});
