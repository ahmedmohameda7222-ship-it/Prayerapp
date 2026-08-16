import type { Locale } from "@/lib/i18n/types";

export type AdhanPrayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type AdhanSoundKind = "regular" | "fajr";

export type AdhanSoundId =
  | "abdul-basit-cairo"
  | "mohamed-refaat-cairo"
  | "mostafa-ismail-cairo"
  | "mahmoud-hosary-cairo"
  | "makkah"
  | "madinah"
  | "fajr-cairo"
  | "fajr-makkah"
  | "fajr-madinah";

export const PRAYER_ADHAN_STORAGE_KEY = "masjid-el-rahman-prayer-adhan-v2";
export const LEGACY_GLOBAL_ADHAN_STORAGE_KEY = "masjid-el-rahman-adhan-sound-v1";

export type AdhanSound = {
  id: AdhanSoundId;
  kind: AdhanSoundKind;
  audioUrl: string;
  label: Record<Locale, string>;
};

export const ADHAN_SOUNDS: readonly AdhanSound[] = [
  {
    id: "abdul-basit-cairo",
    kind: "regular",
    audioUrl: "https://doaatv.com/download/1016",
    label: {
      ar: "عبد الباسط عبد الصمد · القاهرة",
      en: "Abdul Basit Abdus Samad · Cairo",
      de: "Abdul Basit Abdus Samad · Kairo",
      tr: "Abdul Basit Abdus Samad · Kahire",
    },
  },
  {
    id: "mohamed-refaat-cairo",
    kind: "regular",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/7.mp3",
    label: {
      ar: "محمد رفعت · القاهرة",
      en: "Mohamed Refaat · Cairo",
      de: "Mohamed Refaat · Kairo",
      tr: "Mohamed Refaat · Kahire",
    },
  },
  {
    id: "mostafa-ismail-cairo",
    kind: "regular",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/27.mp3",
    label: {
      ar: "مصطفى إسماعيل · القاهرة",
      en: "Mostafa Ismail · Cairo",
      de: "Mostafa Ismail · Kairo",
      tr: "Mostafa Ismail · Kahire",
    },
  },
  {
    id: "mahmoud-hosary-cairo",
    kind: "regular",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/22.mp3",
    label: {
      ar: "محمود خليل الحصري · القاهرة",
      en: "Mahmoud Khalil Al-Hosary · Cairo",
      de: "Mahmoud Khalil Al-Hosary · Kairo",
      tr: "Mahmoud Khalil Al-Hosary · Kahire",
    },
  },
  {
    id: "makkah",
    kind: "regular",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/49.mp3",
    label: {
      ar: "أذان مكة المكرمة",
      en: "Makkah Adhan",
      de: "Adhan aus Mekka",
      tr: "Mekke Ezanı",
    },
  },
  {
    id: "madinah",
    kind: "regular",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/20.mp3",
    label: {
      ar: "أذان المدينة المنورة",
      en: "Madinah Adhan",
      de: "Adhan aus Medina",
      tr: "Medine Ezanı",
    },
  },
  {
    id: "fajr-cairo",
    kind: "fajr",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/10.mp3",
    label: {
      ar: "أذان الفجر · القاهرة",
      en: "Fajr Adhan · Cairo",
      de: "Fajr-Adhan · Kairo",
      tr: "Sabah Ezanı · Kahire",
    },
  },
  {
    id: "fajr-makkah",
    kind: "fajr",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/48.mp3",
    label: {
      ar: "أذان الفجر · مكة المكرمة",
      en: "Fajr Adhan · Makkah",
      de: "Fajr-Adhan · Mekka",
      tr: "Sabah Ezanı · Mekke",
    },
  },
  {
    id: "fajr-madinah",
    kind: "fajr",
    audioUrl: "https://www.ashefaa.com/ruqia/Azan/19.mp3",
    label: {
      ar: "أذان الفجر · المدينة المنورة",
      en: "Fajr Adhan · Madinah",
      de: "Fajr-Adhan · Medina",
      tr: "Sabah Ezanı · Medine",
    },
  },
] as const;

const soundById = new Map<AdhanSoundId, AdhanSound>(ADHAN_SOUNDS.map((sound) => [sound.id, sound]));

export const DEFAULT_REGULAR_ADHAN_SOUND_ID: AdhanSoundId = "abdul-basit-cairo";
export const DEFAULT_FAJR_ADHAN_SOUND_ID: AdhanSoundId = "fajr-cairo";

export function isAdhanPrayer(value: unknown): value is AdhanPrayer {
  return value === "fajr" || value === "dhuhr" || value === "asr" || value === "maghrib" || value === "isha";
}

export function isAdhanSoundId(value: unknown): value is AdhanSoundId {
  return typeof value === "string" && soundById.has(value as AdhanSoundId);
}

export function defaultAdhanSoundIdForPrayer(prayer: AdhanPrayer): AdhanSoundId {
  return prayer === "fajr" ? DEFAULT_FAJR_ADHAN_SOUND_ID : DEFAULT_REGULAR_ADHAN_SOUND_ID;
}

export function getAdhanSound(id: AdhanSoundId): AdhanSound {
  return soundById.get(id) || soundById.get(DEFAULT_REGULAR_ADHAN_SOUND_ID)!;
}

export function getAdhanSoundsForPrayer(prayer: AdhanPrayer): readonly AdhanSound[] {
  const expectedKind: AdhanSoundKind = prayer === "fajr" ? "fajr" : "regular";
  return ADHAN_SOUNDS.filter((sound) => sound.kind === expectedKind);
}

export function normalizeAdhanSoundId(value: unknown, prayer: AdhanPrayer): AdhanSoundId {
  if (prayer === "fajr") {
    if (value === "makkah") return "fajr-makkah";
    if (value === "madinah") return "fajr-madinah";
    if (isAdhanSoundId(value) && getAdhanSound(value).kind === "fajr") return value;
    return DEFAULT_FAJR_ADHAN_SOUND_ID;
  }

  if (value === "fajr-makkah") return "makkah";
  if (value === "fajr-madinah") return "madinah";
  if (isAdhanSoundId(value) && getAdhanSound(value).kind === "regular") return value;
  return DEFAULT_REGULAR_ADHAN_SOUND_ID;
}

export function getAdhanSoundLabel(id: AdhanSoundId, locale: Locale): string {
  return getAdhanSound(id).label[locale];
}
