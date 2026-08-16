"use client";

import { useEffect, useRef } from "react";

export function AppLaunchScreen() {
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    let removeTimer = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        screen.dataset.ready = "true";
        removeTimer = window.setTimeout(() => screen.remove(), 180);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return (
    <div ref={screenRef} className="app-launch-screen" aria-hidden="true">
      <img
        className="app-launch-screen-icon"
        src="/assets/app-icon-192.png"
        alt=""
        width="96"
        height="96"
        decoding="sync"
        fetchPriority="high"
      />
    </div>
  );
}
