import type { JumuahTime } from "@/lib/types";

/**
 * TEMPORARY VISUAL-QA FIXTURE.
 *
 * Used only on the Friday desktop-polish preview branch so Home and Friday can
 * be reviewed with a populated multi-service schedule. Remove this fixture and
 * restore the real Jumuah data source before merging the final visual work.
 */
export const FRIDAY_VISUAL_FIXTURE: JumuahTime[] = [
  {
    id: "visual-jumuah-1",
    date: "2026-08-14",
    khutbahTime: "23:35",
    prayerTime: "23:50",
    locationName: "Masjid El-Rahman",
    locationAddress: "Deggendorf",
    language: "Arabic",
    languageAr: "العربية",
    languageEn: "Arabic",
    languageDe: "Arabisch",
    languageTr: "Arapça",
    notes: "",
    published: true,
  },
  {
    id: "visual-jumuah-2",
    date: "2026-08-14",
    khutbahTime: "23:50",
    prayerTime: "23:59",
    locationName: "Masjid El-Rahman",
    locationAddress: "Deggendorf",
    language: "Arabic",
    languageAr: "العربية",
    languageEn: "Arabic",
    languageDe: "Arabisch",
    languageTr: "Arapça",
    notes: "",
    published: true,
  },
];
