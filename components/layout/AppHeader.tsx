"use client";

import Image from "next/image";
import { NotificationButton } from "@/components/notifications/NotificationButton";

export function AppHeader({ title = "Deggendorf Prayer" }: { title?: string }) {
  return (
    <header className="app-header-banner relative mb-4 overflow-hidden rounded-b-[36px] shadow-[var(--shadow-card)]">
      <div className="sr-only">
        <h1>{title}</h1>
        <p>Prayer times for the city of Deggendorf.</p>
        <p>Indeed, prayer has been decreed upon the believers at specified times. Quran 4:103.</p>
      </div>
      <Image
        src="/assets/app-header-arch-background.png"
        alt=""
        width={1679}
        height={943}
        className="block h-auto w-full"
        sizes="100vw"
        preload
      />
      <div className="absolute end-3 top-3 sm:end-4 sm:top-4">
        <NotificationButton inverted />
      </div>
    </header>
  );
}
