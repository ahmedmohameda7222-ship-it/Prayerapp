import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import "./launch-screen.css";
import "./responsive-prayer-nav.css";
import "./home-ui.css";
import "./prayer-table-localization.css";
import "./home-jumuah.css";
import "./friday-page.css";
import "./native-pwa.css";
import "./pull-to-refresh.css";
import "./public-ui-refresh.css";
import { I18nProvider } from "@/lib/i18n/context";
import { getTextDirection } from "@/lib/i18n/direction";
import { detectSupportedLocale, isLocale, type Locale } from "@/lib/i18n/types";
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
import { ArabicMosqueWordmarkSprite } from "@/components/layout/ArabicMosqueWordmarkSprite";
import { PublicNavigation } from "@/components/layout/PublicNavigation";

const metadataDescriptions: Record<Locale, string> = {
  ar: "مواقيت الصلاة والجمعة والإعلانات والتبرعات ومعلومات المجتمع في دغندورف.",
  en: "Local prayer times, Jumu'ah, announcements, donations, and community information for Deggendorf.",
  de: "Lokale Gebetszeiten, Jumu'ah, Mitteilungen, Spenden und Gemeindeinformationen für Deggendorf.",
  tr: "Deggendorf için yerel namaz vakitleri, cuma, duyurular, bağışlar ve topluluk bilgileri.",
};

async function resolveRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get("locale")?.value;
  if (isLocale(storedLocale)) return storedLocale;

  const requestHeaders = await headers();
  const acceptLanguage = requestHeaders.get("accept-language");
  return detectSupportedLocale(acceptLanguage ? acceptLanguage.split(",") : []);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
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
    other: {
      google: "notranslate",
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
  const initialLocale = await resolveRequestLocale();

  return (
    <html lang={initialLocale} dir={getTextDirection(initialLocale)} translate="no" suppressHydrationWarning>
      <body>
        <ArabicMosqueWordmarkSprite />
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
