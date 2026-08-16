export type AdhanSoundId = "egyptian" | "fajr" | "makkah" | "madinah";
export type AdhanPrayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const ADHAN_PRAYER_SOUND_STORAGE_KEY = "masjid-el-rahman-prayer-adhan-sounds-v2";

export type AdhanSound = {
  id: AdhanSoundId;
  audioUrl: string;
  durationLabel: string;
};

export const ADHAN_SOUNDS: readonly AdhanSound[] = [
  {
    id: "egyptian",
    audioUrl: "https://www.repository.cam.ac.uk/bitstreams/e71f4998-5000-477a-9ae5-a19bc951db09/download",
    durationLabel: "كامل",
  },
  {
    id: "fajr",
    audioUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Eid%20al-Fitr%20Fajr%20azan%20at%20Malm%C3%B6%20Mosque%20-%2019%20August%202012.webm",
    durationLabel: "4:08",
  },
  {
    id: "makkah",
    audioUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Adhan%2C%20Great%20Mosque%20of%20Mecca%20-%20Jan%2021%2C%202013.webm",
    durationLabel: "3:17",
  },
  {
    id: "madinah",
    audioUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/33937%20ejaz215%20call-to-prayer-from-the-prophet-s-mo.ogg",
    durationLabel: "3:07",
  },
] as const;

export const DEFAULT_ADHAN_SOUNDS: Record<AdhanPrayer, AdhanSoundId> = {
  fajr: "fajr",
  dhuhr: "egyptian",
  asr: "egyptian",
  maghrib: "egyptian",
  isha: "egyptian",
};

export function isAdhanSoundId(value: unknown): value is AdhanSoundId {
  return value === "egyptian" || value === "fajr" || value === "makkah" || value === "madinah";
}

export function isAdhanPrayer(value: unknown): value is AdhanPrayer {
  return value === "fajr" || value === "dhuhr" || value === "asr" || value === "maghrib" || value === "isha";
}

export function defaultAdhanSoundForPrayer(prayer: AdhanPrayer): AdhanSoundId {
  return DEFAULT_ADHAN_SOUNDS[prayer];
}

export function getAdhanSound(id: AdhanSoundId) {
  return ADHAN_SOUNDS.find((sound) => sound.id === id) || ADHAN_SOUNDS[0];
}
