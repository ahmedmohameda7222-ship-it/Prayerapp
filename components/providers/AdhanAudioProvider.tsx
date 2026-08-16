"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
  ADHAN_SOUNDS,
  LEGACY_GLOBAL_ADHAN_STORAGE_KEY,
  PRAYER_ADHAN_STORAGE_KEY,
  defaultAdhanSoundIdForPrayer,
  getAdhanSound,
  isAdhanPrayer,
  normalizeAdhanSoundId,
  type AdhanPrayer,
  type AdhanSoundId,
} from "@/lib/adhan-audio";

type AdhanPlaybackStatus = "idle" | "playing" | "blocked" | "error";
type PrayerSoundMap = Record<AdhanPrayer, AdhanSoundId>;

type AdhanAudioContextValue = {
  prayerSounds: PrayerSoundMap;
  playbackStatus: AdhanPlaybackStatus;
  activeSoundId: AdhanSoundId | null;
  getPrayerSound: (prayer: AdhanPrayer) => AdhanSoundId;
  setPrayerSound: (prayer: AdhanPrayer, soundId: AdhanSoundId) => void;
  syncPrayerSounds: (sounds: Partial<Record<AdhanPrayer, unknown>>) => void;
  preloadSound: (soundId: AdhanSoundId) => void;
  primeSound: (soundId: AdhanSoundId) => Promise<boolean>;
  previewSound: (soundId: AdhanSoundId) => Promise<boolean>;
  stopAudio: () => void;
};

type PlaybackCallbacks = {
  onEnded: () => void;
  onError: () => void;
};

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

const PRAYERS: readonly AdhanPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function defaultPrayerSounds(): PrayerSoundMap {
  return {
    fajr: defaultAdhanSoundIdForPrayer("fajr"),
    dhuhr: defaultAdhanSoundIdForPrayer("dhuhr"),
    asr: defaultAdhanSoundIdForPrayer("asr"),
    maghrib: defaultAdhanSoundIdForPrayer("maghrib"),
    isha: defaultAdhanSoundIdForPrayer("isha"),
  };
}

function normalizePrayerSounds(value: unknown): PrayerSoundMap {
  const next = defaultPrayerSounds();
  if (!value || typeof value !== "object") return next;
  const stored = value as Partial<Record<AdhanPrayer, unknown>>;
  for (const prayer of PRAYERS) next[prayer] = normalizeAdhanSoundId(stored[prayer], prayer);
  return next;
}

function readStoredPrayerSounds(): PrayerSoundMap {
  try {
    const stored = localStorage.getItem(PRAYER_ADHAN_STORAGE_KEY);
    return stored ? normalizePrayerSounds(JSON.parse(stored)) : defaultPrayerSounds();
  } catch {
    return defaultPrayerSounds();
  }
}

function storePrayerSounds(sounds: PrayerSoundMap) {
  try {
    localStorage.setItem(PRAYER_ADHAN_STORAGE_KEY, JSON.stringify(sounds));
    localStorage.removeItem(LEGACY_GLOBAL_ADHAN_STORAGE_KEY);
  } catch {
    // A storage failure must not prevent playback during the current session.
  }
}

class AdhanAudioController {
  private audios = new Map<string, HTMLAudioElement>();
  private activeAudio: HTMLAudioElement | null = null;

  private getAudio(sourceUrl: string) {
    const existing = this.audios.get(sourceUrl);
    if (existing) return existing;

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = sourceUrl;
    audio.load();
    this.audios.set(sourceUrl, audio);
    return audio;
  }

  prepare(sourceUrl: string) {
    const audio = this.getAudio(sourceUrl);
    if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) audio.load();
  }

  async prime(sourceUrl: string) {
    const audio = this.getAudio(sourceUrl);
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    audio.muted = true;
    audio.volume = 0;
    try {
      await audio.play();
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Metadata may not be available yet.
      }
      return true;
    } catch {
      return false;
    } finally {
      audio.muted = previousMuted;
      audio.volume = previousVolume;
    }
  }

  async play(sourceUrl: string, callbacks: PlaybackCallbacks) {
    const audio = this.getAudio(sourceUrl);

    if (this.activeAudio && this.activeAudio !== audio) {
      this.activeAudio.pause();
      try {
        this.activeAudio.currentTime = 0;
      } catch {
        // Metadata may not be available yet.
      }
    }

    this.activeAudio = audio;
    audio.onended = callbacks.onEnded;
    audio.onerror = callbacks.onError;
    audio.muted = false;
    audio.volume = 1;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Metadata may not be available yet.
    }
    await audio.play();
  }

  stop() {
    if (!this.activeAudio) return;
    this.activeAudio.pause();
    try {
      this.activeAudio.currentTime = 0;
    } catch {
      // Metadata may not be available yet.
    }
    this.activeAudio = null;
  }

  dispose() {
    for (const audio of this.audios.values()) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
    }
    this.audios.clear();
    this.activeAudio = null;
  }
}

const AdhanAudioContext = createContext<AdhanAudioContextValue | null>(null);

export function AdhanAudioProvider({ children }: { children: React.ReactNode }) {
  const { user } = usePublicAuth();
  const [prayerSounds, setPrayerSounds] = useState<PrayerSoundMap>(() => defaultPrayerSounds());
  const [playbackStatus, setPlaybackStatus] = useState<AdhanPlaybackStatus>("idle");
  const [activeSoundId, setActiveSoundId] = useState<AdhanSoundId | null>(null);
  const controllerRef = useRef<AdhanAudioController | null>(null);
  const lastAdhanEventRef = useRef("");

  const getController = useCallback(() => {
    if (!controllerRef.current) controllerRef.current = new AdhanAudioController();
    return controllerRef.current;
  }, []);

  const stopAudio = useCallback(() => {
    controllerRef.current?.stop();
    setPlaybackStatus("idle");
    setActiveSoundId(null);
  }, []);

  const preloadSound = useCallback((soundId: AdhanSoundId) => {
    getController().prepare(getAdhanSound(soundId).audioUrl);
  }, [getController]);

  const primeSound = useCallback(async (soundId: AdhanSoundId) => (
    getController().prime(getAdhanSound(soundId).audioUrl)
  ), [getController]);

  const playSound = useCallback(async (soundId: AdhanSoundId) => {
    const sound = getAdhanSound(soundId);
    setActiveSoundId(sound.id);
    try {
      await getController().play(sound.audioUrl, {
        onEnded: () => {
          setPlaybackStatus("idle");
          setActiveSoundId(null);
        },
        onError: () => {
          setPlaybackStatus("error");
          setActiveSoundId(null);
        },
      });
      setPlaybackStatus("playing");
      return true;
    } catch (error) {
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      setPlaybackStatus(blocked ? "blocked" : "error");
      setActiveSoundId(null);
      return false;
    }
  }, [getController]);

  const syncPrayerSounds = useCallback((sounds: Partial<Record<AdhanPrayer, unknown>>) => {
    setPrayerSounds((current) => {
      const next = { ...current };
      for (const prayer of PRAYERS) {
        if (Object.prototype.hasOwnProperty.call(sounds, prayer)) {
          next[prayer] = normalizeAdhanSoundId(sounds[prayer], prayer);
        }
      }
      storePrayerSounds(next);
      return next;
    });
  }, []);

  const setPrayerSound = useCallback((prayer: AdhanPrayer, soundId: AdhanSoundId) => {
    syncPrayerSounds({ [prayer]: soundId });
    preloadSound(normalizeAdhanSoundId(soundId, prayer));
  }, [preloadSound, syncPrayerSounds]);

  const getPrayerSound = useCallback((prayer: AdhanPrayer) => (
    normalizeAdhanSoundId(prayerSounds[prayer], prayer)
  ), [prayerSounds]);

  const previewSound = useCallback(async (soundId: AdhanSoundId) => playSound(soundId), [playSound]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readStoredPrayerSounds();
      setPrayerSounds(stored);
      storePrayerSounds(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadAccountSounds = async () => {
      const client = createClient();
      if (!client) return;
      const { data, error } = await client
        .from("user_prayer_reminders")
        .select("prayer, adhan_sound_id")
        .eq("user_id", user.id);
      if (!active || error || !data) return;

      const accountSounds: Partial<Record<AdhanPrayer, unknown>> = {};
      for (const row of data as Array<{ prayer: string; adhan_sound_id: string | null }>) {
        if (isAdhanPrayer(row.prayer)) accountSounds[row.prayer] = row.adhan_sound_id;
      }
      syncPrayerSounds(accountSounds);
    };
    void loadAccountSounds();
    return () => { active = false; };
  }, [syncPrayerSounds, user]);

  useEffect(() => {
    const controller = getController();
    const selectedSoundIds = Array.from(new Set(Object.values(prayerSounds)));
    for (const soundId of selectedSoundIds) controller.prepare(getAdhanSound(soundId).audioUrl);

    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return;

    const preloadAll = () => {
      for (const sound of ADHAN_SOUNDS) controller.prepare(sound.audioUrl);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preloadAll, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = window.setTimeout(preloadAll, 900);
    return () => window.clearTimeout(timer);
  }, [getController, prayerSounds]);

  useEffect(() => {
    const controller = getController();
    let unlocked = false;
    const unlockSelectedSounds = () => {
      if (unlocked) return;
      unlocked = true;
      const selectedSoundIds = Array.from(new Set(Object.values(prayerSounds)));
      for (const soundId of selectedSoundIds) {
        void controller.prime(getAdhanSound(soundId).audioUrl);
      }
    };

    window.addEventListener("pointerdown", unlockSelectedSounds, { once: true, capture: true });
    window.addEventListener("keydown", unlockSelectedSounds, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlockSelectedSounds, true);
      window.removeEventListener("keydown", unlockSelectedSounds, true);
    };
  }, [getController, prayerSounds]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; tag?: string; prayer?: string } | null;
      if (data?.type !== "ADHAN_DUE" || !isAdhanPrayer(data.prayer)) return;
      if (data.tag && lastAdhanEventRef.current === data.tag) return;
      if (data.tag) lastAdhanEventRef.current = data.tag;
      void playSound(getPrayerSound(data.prayer));
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [getPrayerSound, playSound]);

  useEffect(() => () => {
    controllerRef.current?.dispose();
  }, []);

  const value = useMemo<AdhanAudioContextValue>(() => ({
    prayerSounds,
    playbackStatus,
    activeSoundId,
    getPrayerSound,
    setPrayerSound,
    syncPrayerSounds,
    preloadSound,
    primeSound,
    previewSound,
    stopAudio,
  }), [activeSoundId, getPrayerSound, playbackStatus, prayerSounds, preloadSound, previewSound, primeSound, setPrayerSound, stopAudio, syncPrayerSounds]);

  return <AdhanAudioContext.Provider value={value}>{children}</AdhanAudioContext.Provider>;
}

export function useAdhanAudio() {
  const value = useContext(AdhanAudioContext);
  if (!value) throw new Error("useAdhanAudio must be used inside AdhanAudioProvider");
  return value;
}
