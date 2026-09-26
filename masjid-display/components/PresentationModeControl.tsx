"use client";

import { useEffect, useState } from "react";

const FALLBACK_MESSAGE =
  "Vollbild über das Browser-Menü aktivieren / فعّل ملء الشاشة من قائمة المتصفح.";

export function PresentationModeControl() {
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    const syncFullscreenState = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreenActive(active);
      if (active) setFallbackMessage(null);
    };

    const handleFullscreenError = () => {
      setFallbackMessage(FALLBACK_MESSAGE);
    };

    setSupported(typeof root.requestFullscreen === "function");
    syncFullscreenState();

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("fullscreenerror", handleFullscreenError);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("fullscreenerror", handleFullscreenError);
    };
  }, []);

  const enterFullscreen = async () => {
    const root = document.documentElement;
    if (typeof root.requestFullscreen !== "function") {
      setSupported(false);
      setFallbackMessage(FALLBACK_MESSAGE);
      return;
    }

    setFallbackMessage(null);

    try {
      await root.requestFullscreen({ navigationUI: "hide" });
    } catch (error) {
      if (error instanceof TypeError) {
        try {
          await root.requestFullscreen();
          return;
        } catch {
          // Fall through to the normal browser-level fallback guidance.
        }
      }

      setFallbackMessage(FALLBACK_MESSAGE);
    }
  };

  if (supported === null || fullscreenActive) return null;

  if (!supported) {
    return (
      <p className="presentation-mode-fallback" role="status">
        {FALLBACK_MESSAGE}
      </p>
    );
  }

  return (
    <div className="presentation-mode-control">
      <button type="button" onClick={enterFullscreen}>
        Vollbild / ملء الشاشة
      </button>
      {fallbackMessage ? (
        <p className="presentation-mode-fallback" role="status">
          {fallbackMessage}
        </p>
      ) : null}
    </div>
  );
}
