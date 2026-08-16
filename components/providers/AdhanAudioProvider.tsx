"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import {
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
  previewSound: (soundId: AdhanSoundId) => Promise<boolean>;
  stopAudio: () => void;
};

type PlaybackCallbacks = {
  onEnded: () => void;
  onError: () => void;
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
  private audio: HTMLAudioElement | null = null;
  private sourceUrl = "";
  private onEnded: (() => void) | null = null;
  private onError: (() => void) | null = null;

  async play(sourceUrl: string, callbacks: PlaybackCallbacks) {
    if (!this.audio || this.sourceUrl !== sourceUrl) {
      this.dispose();
      const nextAudio = new Audio(sourceUrl);
      nextAudio.preload = "auto";
      this.onEnded = callbacks.onEnded;
      this.onError = callbacks.onError;
      nextAudio.addEventListener("ended", this.onEnded);
      nextAudio.addEventListener("error", this.onError);
      this.audio = nextAudio;
      this.sourceUrl = sourceUrl;
    }

    const audio = this.audio;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Metadata may not be available yet.
    }
    await audio.play();
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    try {
      this.audio.currentTime = 0;
    } catch {
      // Metadata may not be available yet.
    }
  }

  dispose() {
    if (!this.audio) return;
    this.audio.pause();
    if (this.onEnded) this.audio.removeEventListener("ended", this.onEnded);
    if (this.onError) this.audio.removeEventListener("error", this.onError);
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
    this.sourceUrl = "";
    this.onEnded = null;
    this.onError = null;
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
  }, [syncPrayerSounds]);

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
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; tag?: string; prayer?: string } | null;
      if (data?.type !== "ADHAN_DUE" || !isAdhanPrayer(data.prayer)) return;
      if (document.visibilityState !== "visible") return;
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
    previewSound,
    stopAudio,
  }), [activeSoundId, getPrayerSound, playbackStatus, prayerSounds, previewSound, setPrayerSound, stopAudio, syncPrayerSounds]);

  return <AdhanAudioContext.Provider value={value}>{children}</AdhanAudioContext.Provider>;
}

export function useAdhanAudio() {
  const value = useContext(AdhanAudioContext);
  if (!value) throw new Error("useAdhanAudio must be used inside AdhanAudioProvider");
  return value;
}
