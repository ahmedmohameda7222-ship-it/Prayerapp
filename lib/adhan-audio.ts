export type AdhanSoundId = "system-only" | "adhan-1" | "adhan-2";

export const ADHAN_SOUND_STORAGE_KEY = "masjid-el-rahman-adhan-sound-v1";

export type AdhanSound = {
  id: AdhanSoundId;
  audioUrl: string | null;
  durationLabel: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
};

export const ADHAN_SOUNDS: readonly AdhanSound[] = [
  {
    id: "system-only",
    audioUrl: null,
    durationLabel: null,
    sourceLabel: null,
    sourceUrl: null,
  },
  {
    id: "adhan-1",
    audioUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Muslim_calling_to_prayer.ogg",
    durationLabel: "1:42",
    sourceLabel: "Wikimedia Commons · CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Muslim_calling_to_prayer.ogg",
  },
  {
    id: "adhan-2",
    audioUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Beautiful_adhan.ogg",
    durationLabel: "2:34",
    sourceLabel: "Wikimedia Commons · CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg",
  },
] as const;

export function isAdhanSoundId(value: unknown): value is AdhanSoundId {
  return value === "system-only" || value === "adhan-1" || value === "adhan-2";
}

export function getAdhanSound(id: AdhanSoundId) {
  return ADHAN_SOUNDS.find((sound) => sound.id === id) || ADHAN_SOUNDS[0];
}
