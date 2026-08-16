"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function AppLaunchScreen() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let secondFrame = 0;
    let removeTimer = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setReady(true);
        removeTimer = window.setTimeout(() => setVisible(false), 180);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="app-launch-screen" data-ready={ready ? "true" : undefined} aria-hidden="true">
      <Image
        className="app-launch-screen-icon"
        src="/assets/app-icon-192.png"
        alt=""
        width={96}
        height={96}
        priority
      />
    </div>
  );
}
