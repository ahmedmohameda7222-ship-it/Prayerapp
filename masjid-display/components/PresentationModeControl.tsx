"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const FALLBACK_MESSAGE =
  "Vollbild über das Browser-Menü aktivieren / فعّل ملء الشاشة من قائمة المتصفح.";

function subscribeToFullscreen(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  return () => document.removeEventListener("fullscreenchange", onStoreChange);
}

function fullscreenSnapshot() {
  return Boolean(document.fullscreenElement);
}

function fullscreenServerSnapshot() {
  return false;
}

function fullscreenSupportSnapshot() {
  return typeof document.documentElement.requestFullscreen === "function";
}

function fullscreenSupportServerSnapshot() {
  return false;
}

export function PresentationModeControl() {
  const fullscreenActive = useSyncExternalStore(
    subscribeToFullscreen,
    fullscreenSnapshot,
    fullscreenServerSnapshot,
  );
  const supported = useSyncExternalStore(
    subscribeToFullscreen,
    fullscreenSupportSnapshot,
    fullscreenSupportServerSnapshot,
  );
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setFallbackMessage(null);
      }
    };

    const handleFullscreenError = () => {
      setFallbackMessage(FALLBACK_MESSAGE);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("fullscreenerror", handleFullscreenError);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("fullscreenerror", handleFullscreenError);
    };
  }, []);

  const enterFullscreen = async () => {
    const root = document.documentElement;
    if (typeof root.requestFullscreen !== "function") {
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

  if (fullscreenActive) return null;

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
