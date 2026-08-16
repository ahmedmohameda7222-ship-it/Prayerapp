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
  previewSound: (soundId: Exclude<AdhanSoundId, "system-only">) => Promise<boolean>;
  stopAudio: () => void;
};

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastAdhanEventRef = useRef("");

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // The media source may not have metadata yet.
      }
    }
    setPlaybackStatus("idle");
    setActiveSoundId(null);
  }, []);

  const playSound = useCallback(async (requestedSoundId: Exclude<AdhanSoundId, "system-only">) => {
    const sound = getAdhanSound(requestedSoundId);
    if (!sound.audioUrl) return false;

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
      audio.addEventListener("ended", () => {
        setPlaybackStatus("idle");
        setActiveSoundId(null);
      });
      audio.addEventListener("error", () => {
        setPlaybackStatus("error");
        setActiveSoundId(null);
      });
    }

    if (audio.src !== sound.audioUrl) audio.src = sound.audioUrl;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Reset again after metadata loads if the browser does not allow it yet.
    }

    setActiveSoundId(requestedSoundId);
    try {
      await audio.play();
      setPlaybackStatus("playing");
      return true;
    } catch (error) {
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      setPlaybackStatus(blocked ? "blocked" : "error");
      setActiveSoundId(null);
      return false;
    }
  }, []);

  const setSoundId = useCallback((nextSoundId: AdhanSoundId) => {
    setSoundIdState(nextSoundId);
    try {
      localStorage.setItem(ADHAN_SOUND_STORAGE_KEY, nextSoundId);
    } catch {
      // Device storage failure should not block the current session preference.
    }
    if (nextSoundId === "system-only") stopAudio();
  }, [stopAudio]);

  const previewSound = useCallback(async (requestedSoundId: Exclude<AdhanSoundId, "system-only">) => {
    setSoundId(requestedSoundId);
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
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
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
