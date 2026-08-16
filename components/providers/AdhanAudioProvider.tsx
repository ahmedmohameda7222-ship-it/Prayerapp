"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ADHAN_PRAYER_SOUND_STORAGE_KEY,
  DEFAULT_ADHAN_SOUNDS,
  getAdhanSound,
  isAdhanPrayer,
  isAdhanSoundId,
  type AdhanPrayer,
  type AdhanSoundId,
} from "@/lib/adhan-audio";

type AdhanPlaybackStatus = "idle" | "playing" | "blocked" | "error";
type PrayerSoundMap = Record<AdhanPrayer, AdhanSoundId>;

type AdhanAudioContextValue = {
  prayerSounds: PrayerSoundMap;
  playbackStatus: AdhanPlaybackStatus;
  activeSoundId: AdhanSoundId | null;
  setPrayerSound: (prayer: AdhanPrayer, soundId: AdhanSoundId) => void;
  syncPrayerSounds: (sounds: Partial<PrayerSoundMap>) => void;
  previewSound: (soundId: AdhanSoundId) => Promise<boolean>;
  stopAudio: () => void;
};

type PlaybackCallbacks = {
  onEnded: () => void;
  onError: () => void;
};

class AdhanAudioController {
  private audio: HTMLAudioElement | null = null;
  private sourceUrl = "";

  async play(sourceUrl: string, callbacks: PlaybackCallbacks) {
    if (!this.audio || this.sourceUrl !== sourceUrl) {
      this.dispose();
      const nextAudio = new Audio(sourceUrl);
      nextAudio.preload = "metadata";
      nextAudio.addEventListener("ended", callbacks.onEnded);
      nextAudio.addEventListener("error", callbacks.onError);
      this.audio = nextAudio;
      this.sourceUrl = sourceUrl;
    }

    const audio = this.audio;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Metadata may not be ready yet.
    }
    await audio.play();
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    try {
      this.audio.currentTime = 0;
    } catch {
      // Metadata may not be ready yet.
    }
  }

  dispose() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.audio = null;
    this.sourceUrl = "";
  }
}

const AdhanAudioContext = createContext<AdhanAudioContextValue | null>(null);

function readStoredPrayerSounds(): PrayerSoundMap {
  const fallback = { ...DEFAULT_ADHAN_SOUNDS };
  try {
    const raw = localStorage.getItem(ADHAN_PRAYER_SOUND_STORAGE_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<Record<AdhanPrayer, unknown>>;
    for (const prayer of Object.keys(fallback) as AdhanPrayer[]) {
      if (isAdhanSoundId(stored[prayer])) fallback[prayer] = stored[prayer];
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function persistPrayerSounds(sounds: PrayerSoundMap) {
  try {
    localStorage.setItem(ADHAN_PRAYER_SOUND_STORAGE_KEY, JSON.stringify(sounds));
  } catch {
    // Device storage failure should not block the current session preference.
  }
}

export function AdhanAudioProvider({ children }: { children: React.ReactNode }) {
  const [prayerSounds, setPrayerSoundsState] = useState<PrayerSoundMap>(() => ({ ...DEFAULT_ADHAN_SOUNDS }));
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

  const playSound = useCallback(async (requestedSoundId: AdhanSoundId) => {
    const sound = getAdhanSound(requestedSoundId);
    setActiveSoundId(requestedSoundId);
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

  const setPrayerSound = useCallback((prayer: AdhanPrayer, soundId: AdhanSoundId) => {
    setPrayerSoundsState((current) => {
      const next = { ...current, [prayer]: soundId };
      persistPrayerSounds(next);
      return next;
    });
  }, []);

  const syncPrayerSounds = useCallback((sounds: Partial<PrayerSoundMap>) => {
    setPrayerSoundsState((current) => {
      const next = { ...current };
      for (const prayer of Object.keys(DEFAULT_ADHAN_SOUNDS) as AdhanPrayer[]) {
        const candidate = sounds[prayer];
        if (candidate && isAdhanSoundId(candidate)) next[prayer] = candidate;
      }
      persistPrayerSounds(next);
      return next;
    });
  }, []);

  const previewSound = useCallback(async (requestedSoundId: AdhanSoundId) => {
    return playSound(requestedSoundId);
  }, [playSound]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPrayerSoundsState(readStoredPrayerSounds()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; tag?: string; prayer?: unknown } | null;
      if (data?.type !== "ADHAN_DUE" || !isAdhanPrayer(data.prayer)) return;
      if (document.visibilityState !== "visible") return;
      if (data.tag && lastAdhanEventRef.current === data.tag) return;
      if (data.tag) lastAdhanEventRef.current = data.tag;
      void playSound(prayerSounds[data.prayer]);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [playSound, prayerSounds]);

  useEffect(() => () => {
    controllerRef.current?.dispose();
  }, []);

  const value = useMemo<AdhanAudioContextValue>(() => ({
    prayerSounds,
    playbackStatus,
    activeSoundId,
    setPrayerSound,
    syncPrayerSounds,
    previewSound,
    stopAudio,
  }), [activeSoundId, playbackStatus, prayerSounds, previewSound, setPrayerSound, stopAudio, syncPrayerSounds]);

  return <AdhanAudioContext.Provider value={value}>{children}</AdhanAudioContext.Provider>;
}

export function useAdhanAudio() {
  const value = useContext(AdhanAudioContext);
  if (!value) throw new Error("useAdhanAudio must be used inside AdhanAudioProvider");
  return value;
}
