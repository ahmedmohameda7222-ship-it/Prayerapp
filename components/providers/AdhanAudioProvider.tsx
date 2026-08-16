"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ADHAN_SOUND_STORAGE_KEY,
  getAdhanSound,
  isAdhanSoundId,
  type AdhanSoundId,
} from "@/lib/adhan-audio";

type AdhanPlaybackStatus = "idle" | "playing" | "blocked" | "error";

type AdhanAudioContextValue = {
  soundId: AdhanSoundId;
  playbackStatus: AdhanPlaybackStatus;
  activeSoundId: AdhanSoundId | null;
  setSoundId: (soundId: AdhanSoundId) => void;
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
      nextAudio.preload = "auto";
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
      // The media source may not have metadata yet.
    }
    await audio.play();
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    try {
      this.audio.currentTime = 0;
    } catch {
      // The media source may not have metadata yet.
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

function readStoredSound(): AdhanSoundId {
  try {
    const stored = localStorage.getItem(ADHAN_SOUND_STORAGE_KEY);
    return isAdhanSoundId(stored) ? stored : "system-only";
  } catch {
    return "system-only";
  }
}

export function AdhanAudioProvider({ children }: { children: React.ReactNode }) {
  const [soundId, setSoundIdState] = useState<AdhanSoundId>("system-only");
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

  const playSound = useCallback(async (requestedSoundId: Exclude<AdhanSoundId, "system-only">) => {
    const sound = getAdhanSound(requestedSoundId);
    if (!sound.audioUrl) return false;

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

  const setSoundId = useCallback((nextSoundId: AdhanSoundId) => {
    setSoundIdState(nextSoundId);
    try {
      localStorage.setItem(ADHAN_SOUND_STORAGE_KEY, nextSoundId);
    } catch {
      // Device storage failure should not block the current session preference.
    }
    if (nextSoundId === "system-only") stopAudio();
  }, [stopAudio]);

  const previewSound = useCallback(async (requestedSoundId: AdhanSoundId) => {
    setSoundId(requestedSoundId);
    if (requestedSoundId === "system-only") return false;
    return playSound(requestedSoundId);
  }, [playSound, setSoundId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSoundIdState(readStoredSound()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; tag?: string } | null;
      if (data?.type !== "ADHAN_DUE" || soundId === "system-only") return;
      if (document.visibilityState !== "visible") return;
      if (data.tag && lastAdhanEventRef.current === data.tag) return;
      if (data.tag) lastAdhanEventRef.current = data.tag;
      void playSound(soundId);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [playSound, soundId]);

  useEffect(() => () => {
    controllerRef.current?.dispose();
  }, []);

  const value = useMemo<AdhanAudioContextValue>(() => ({
    soundId,
    playbackStatus,
    activeSoundId,
    setSoundId,
    previewSound,
    stopAudio,
  }), [activeSoundId, playbackStatus, previewSound, setSoundId, soundId, stopAudio]);

  return <AdhanAudioContext.Provider value={value}>{children}</AdhanAudioContext.Provider>;
}

export function useAdhanAudio() {
  const value = useContext(AdhanAudioContext);
  if (!value) throw new Error("useAdhanAudio must be used inside AdhanAudioProvider");
  return value;
}
