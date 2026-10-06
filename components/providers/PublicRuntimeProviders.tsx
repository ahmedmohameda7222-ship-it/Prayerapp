"use client";

import type { ReactNode } from "react";
import { AdhanAudioProvider } from "@/components/providers/AdhanAudioProvider";
import { AndroidUpdateProvider } from "@/components/providers/AndroidUpdateProvider";
import { AppLaunchScreen } from "@/components/providers/AppLaunchScreen";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { NativeAndroidProvider } from "@/components/providers/NativeAndroidProvider";
import { PlatformChromeBootstrap } from "@/components/providers/PlatformChromeBootstrap";
import { PullToRefresh } from "@/components/providers/PullToRefresh";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";
import { ArabicMosqueWordmarkSprite } from "@/components/layout/ArabicMosqueWordmarkSprite";
import { PublicNavigation } from "@/components/layout/PublicNavigation";
import { NotificationOptInPrompt } from "@/components/notifications/NotificationOptInPrompt";

export function PublicRuntimeProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ArabicMosqueWordmarkSprite />
      <PlatformChromeBootstrap />
      <AppLaunchScreen />
      <AppPreferencesProvider>
        <NativeAndroidProvider>
          <AndroidUpdateProvider>
            <AdhanAudioProvider>
              {children}
              <PublicNavigation />
              <PullToRefresh />
            </AdhanAudioProvider>
            <ServiceWorkerRegistrar />
            <NotificationOptInPrompt />
          </AndroidUpdateProvider>
        </NativeAndroidProvider>
      </AppPreferencesProvider>
    </>
  );
}
