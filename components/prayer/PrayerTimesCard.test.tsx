import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n/context";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";
import type { PrayerIqamaTimes, PrayerTime } from "@/lib/types";
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
  published: true,
  updatedAt: "2026-06-28T00:00:00.000Z",
};
const iqamaTimes: PrayerIqamaTimes = { fajr: "03:45", dhuhr: "13:22", asr: "17:38", maghrib: "21:19", isha: "23:07" };

function renderCard(value: PrayerTime) {
  render(
    <I18nProvider initialLocale="en">
      <TimeFormatProvider>
        <PrayerTimesCard prayer={value} iqamaTimes={iqamaTimes} />
      </TimeFormatProvider>
    </I18nProvider>,
  );
}

describe("PrayerTimesCard display settings", () => {
  beforeEach(() => {
    document.cookie = "timeFormat=24-hour; path=/";
  });

  it("shows shared-delay Iqama while preserving manual combined Isha as program metadata", () => {
    renderCard({
      ...prayer,
      maghribProgram: {
        enabled: true,
        lessonTitle: "Tafsir",
        lessonDurationMinutes: 10,
        combinedIshaTime: "21:35",
      },
    });

    expect(screen.getByText("Tafsir · 10 min")).toBeInTheDocument();
    expect(screen.getByText("Azan Isha")).toBeInTheDocument();
    expect(screen.getByText("22:57")).toBeInTheDocument();
    expect(screen.getByText("23:07")).toBeInTheDocument();
    expect(screen.getByText("21:35")).toBeInTheDocument();
  });

  it("hides optional Maghrib program metadata when disabled", () => {
    renderCard({
      ...prayer,
      maghribProgram: {
        enabled: false,
        lessonTitle: "Tafsir",
        lessonDurationMinutes: 10,
        combinedIshaTime: "21:35",
      },
    });

    expect(screen.queryByText("Tafsir · 10 min")).not.toBeInTheDocument();
    expect(screen.queryByText("21:35")).not.toBeInTheDocument();
    expect(screen.getByText("Azan Isha")).toBeInTheDocument();
  });
});
