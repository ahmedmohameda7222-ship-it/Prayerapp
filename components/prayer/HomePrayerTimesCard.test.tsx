import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePrayerTimesCard } from "./HomePrayerTimesCard";
import type { PrayerTime } from "@/lib/types";

vi.mock("@/components/providers/AuthProvider", () => ({
  usePublicAuth: () => ({ user: null }),
}));

vi.mock("@/components/providers/AppPreferencesProvider", () => ({
  useAppPreferences: () => ({ pushStatus: "disabled", enableNotifications: vi.fn() }),
}));

vi.mock("@/components/providers/TimeFormatProvider", () => ({
  useTimeFormat: () => ({ timeFormat: "24-hour" }),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => null }));

vi.mock("@/lib/i18n/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      "prayer.fajr": "Fajr",
      "prayer.sunrise": "Sunrise",
      "prayer.dhuhr": "Dhuhr",
      "prayer.asr": "Asr",
      "prayer.maghrib": "Maghrib",
      "prayer.isha": "Isha",
      "prayer.prayer": "Prayer",
      "prayer.azan": "Adhan",
      "prayer.iqama": "Iqama",
      "prayer.todaysPrayerTimes": "Today's Prayer Times",
      "prayer.khatira": "Khatira",
      "prayer.minutes": "min",
      "phase1.reminderDescription": "Prayer reminders",
      "phase1.reminderOn": "Reminder on",
      "phase1.reminderOff": "Reminder off",
      "phase1.reminderSaveError": "Save error",
      "phase1.combinedIsha": "Combined Salat Isha",
    }[key] || key),
  }),
}));

const prayer: PrayerTime = {
  id: "pt-test",
  date: "2026-08-12",
  fajr: "03:45",
  sunrise: "05:52",
  dhuhr: "13:15",
  asr: "17:10",
  maghrib: "20:35",
  isha: "22:10",
  fajrIqama: "04:15",
  dhuhrIqama: "13:30",
  asrIqama: "17:30",
  maghribIqama: "20:45",
  ishaIqama: "23:10",
  published: true,
  updatedAt: "2026-08-11T12:00:00+02:00",
  maghribProgram: {
    enabled: true,
    maghribIqamaTime: "20:47",
    lessonTitle: "Short lesson",
    lessonDurationMinutes: 15,
    combinedIshaTime: "22:40",
  },
};

describe("HomePrayerTimesCard", () => {
  it("keeps the normal Isha iqama on the Isha row and combined Isha inside the Maghrib program", () => {
    const { container } = render(<HomePrayerTimesCard prayer={prayer} activePrayer="isha" />);

    const ishaRow = container.querySelector('[data-prayer-row="isha"]');
    expect(ishaRow).not.toBeNull();
    expect(within(ishaRow as HTMLElement).getByText("23:10")).toBeInTheDocument();
    expect(within(ishaRow as HTMLElement).queryByText("22:40")).not.toBeInTheDocument();

    const maghribProgram = screen.getByTestId("maghrib-program");
    expect(within(maghribProgram).getByText("Combined Salat Isha")).toBeInTheDocument();
    expect(within(maghribProgram).getByText("22:40")).toBeInTheDocument();
  });
});
