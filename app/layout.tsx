import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./responsive-prayer-nav.css";
import "./home-palette-preview.css";
import "./home-jumuah.css";
import "./friday-page.css";
import "./public-app-shell.css";
import { I18nProvider } from "@/lib/i18n/context";
import { getTextDirection } from "@/lib/i18n/direction";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/types";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { PlatformAttributes } from "@/components/providers/PlatformAttributes";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";
import { NotificationOptInPrompt } from "@/components/notifications/NotificationOptInPrompt";

const metadataDescriptions: Record<Locale, string> = {
  ar: "مواقيت الصلاة والجمعة والإعلانات والتبرعات ومعلومات المجتمع في دغندورف.",
  en: "Local prayer times, Jumu'ah, announcements, donations, and community information for Deggendorf.",
  de: "Lokale Gebetszeiten, Jumu'ah, Mitteilungen, Spenden und Gemeindeinformationen für Deggendorf.",
  tr: "Deggendorf için yerel namaz vakitleri, cuma, duyurular, bağışlar ve topluluk bilgileri.",
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("locale")?.value || DEFAULT_LOCALE);

  return {
    title: "Masjid El-Rahman",
    description: metadataDescriptions[locale],
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/assets/app-icon-192.png",
      apple: "/assets/app-icon-192.png",
    },
    appleWebApp: {
      capable: true,
      title: "Masjid El-Rahman",
      statusBarStyle: "black-translucent",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#173F34",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
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
        <PlatformAttributes />
        <I18nProvider initialLocale={initialLocale}>
          <AuthProvider>
            <AppPreferencesProvider>
              <TimeFormatProvider>{children}</TimeFormatProvider>
              <ServiceWorkerRegistrar />
              <NotificationOptInPrompt />
            </AppPreferencesProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
