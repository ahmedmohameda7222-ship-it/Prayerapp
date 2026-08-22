import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./launch-screen.css";
import "./responsive-prayer-nav.css";
import "./home-palette-preview.css";
import "./home-jumuah.css";
import "./friday-page.css";
import "./native-pwa.css";
import "./pull-to-refresh.css";
import "./public-ui-refresh.css";
import { I18nProvider } from "@/lib/i18n/context";
import { getTextDirection } from "@/lib/i18n/direction";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/types";
import { APP_NAMES } from "@/lib/app-brand";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { NativeAndroidProvider } from "@/components/providers/NativeAndroidProvider";
import { AndroidUpdateProvider } from "@/components/providers/AndroidUpdateProvider";
import { AdhanAudioProvider } from "@/components/providers/AdhanAudioProvider";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";
import { PlatformChromeBootstrap } from "@/components/providers/PlatformChromeBootstrap";
import { AppLaunchScreen } from "@/components/providers/AppLaunchScreen";
import { PullToRefresh } from "@/components/providers/PullToRefresh";
import { NotificationOptInPrompt } from "@/components/notifications/NotificationOptInPrompt";
import { PublicNavigation } from "@/components/layout/PublicNavigation";

const metadataDescriptions: Record<Locale, string> = {
  ar: "مواقيت الصلاة والجمعة والإعلانات والتبرعات ومعلومات المجتمع في دغندورف.",
  en: "Local prayer times, Jumu'ah, announcements, donations, and community information for Deggendorf.",
  de: "Lokale Gebetszeiten, Jumu'ah, Mitteilungen, Spenden und Gemeindeinformationen für Deggendorf.",
  tr: "Deggendorf için yerel namaz vakitleri, cuma, duyurular, bağışlar ve topluluk bilgileri.",
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("locale")?.value || DEFAULT_LOCALE);
  const appName = APP_NAMES[locale];

  return {
    title: appName,
    description: metadataDescriptions[locale],
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/assets/app-icon-192.png",
      apple: "/assets/app-icon-192.png",
    },
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: "black-translucent",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#005a52",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = normalizeLocale(cookieStore.get("locale")?.value || DEFAULT_LOCALE);

  return (
    <html lang={initialLocale} dir={getTextDirection(initialLocale)} suppressHydrationWarning>
      <body>
        <PlatformChromeBootstrap />
        <AppLaunchScreen />
        <I18nProvider initialLocale={initialLocale}>
          <AuthProvider>
            <AppPreferencesProvider>
              <NativeAndroidProvider>
                <AndroidUpdateProvider>
                  <AdhanAudioProvider>
                    <TimeFormatProvider>
                      {children}
                      <PublicNavigation />
                      <PullToRefresh />
                    </TimeFormatProvider>
                  </AdhanAudioProvider>
                  <ServiceWorkerRegistrar />
                  <NotificationOptInPrompt />
                </AndroidUpdateProvider>
              </NativeAndroidProvider>
            </AppPreferencesProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
