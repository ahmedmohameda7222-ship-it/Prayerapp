import { FridayPageClient } from "@/components/friday/FridayPageClient";
import { AppShell } from "@/components/layout/AppShell";
import { RootPageHeader } from "@/components/layout/RootPageHeader";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import type { JumuahTime } from "@/lib/types";

function getNextFridayIso(now: Date) {
  const today = todayIso(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const daysUntilFriday = (5 - weekday + 7) % 7 || 7;
  return addDaysIso(today, daysUntilFriday);
}

function getFridayPreviewMockData(now: Date): JumuahTime[] {
  const date = getNextFridayIso(now);
  const sharedNotes = {
    notes: "Please arrive 10 minutes before the khutbah.",
    notesAr: "يرجى الحضور قبل الخطبة بعشر دقائق.",
    notesEn: "Please arrive 10 minutes before the khutbah.",
    notesDe: "Bitte 10 Minuten vor der Khutbah eintreffen.",
    notesTr: "Lütfen hutbeden 10 dakika önce gelin.",
  };
  const sharedLocation = {
    locationName: "Masjid El-Rahman",
    locationAddress: "Deggendorf",
  };

  return [
    {
      id: "friday-preview-1",
      date,
      khutbahTime: "12:15",
      prayerTime: "12:30",
      ...sharedLocation,
      khateebName: "Sheikh Ahmad",
      language: "Arabic",
      languageAr: "العربية",
      languageEn: "Arabic",
      languageDe: "Arabisch",
      languageTr: "Arapça",
      ...sharedNotes,
      published: true,
    },
    {
      id: "friday-preview-2",
      date,
      khutbahTime: "13:15",
      prayerTime: "13:30",
      ...sharedLocation,
      khateebName: "Sheikh Yusuf",
      language: "German",
      languageAr: "الألمانية",
      languageEn: "German",
      languageDe: "Deutsch",
      languageTr: "Almanca",
      ...sharedNotes,
      published: true,
    },
    {
      id: "friday-preview-3",
      date,
      khutbahTime: "14:15",
      prayerTime: "14:30",
      ...sharedLocation,
      khateebName: "Sheikh Omar",
      language: "Turkish",
      languageAr: "التركية",
      languageEn: "Turkish",
      languageDe: "Türkisch",
      languageTr: "Türkçe",
      ...sharedNotes,
      published: true,
    },
  ];
}

function shouldUseFridayPreviewMock() {
  return process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
}

export default async function FridayPage() {
  const now = new Date();
  const initialNow = now.toISOString();
  let jumuahTimes: JumuahTime[] = [];
  let loadFailed = false;

  try {
    jumuahTimes = await getJumuahTimes();
  } catch {
    loadFailed = true;
  }

  if (!loadFailed && jumuahTimes.length === 0 && shouldUseFridayPreviewMock()) {
    jumuahTimes = getFridayPreviewMockData(now);
  }

  return (
    <AppShell surface="root">
      <RootPageHeader titleKey="nav.friday" />
      <FridayPageClient
        jumuahTimes={jumuahTimes}
        initialNow={initialNow}
        loadFailed={loadFailed}
      />
    </AppShell>
  );
}
