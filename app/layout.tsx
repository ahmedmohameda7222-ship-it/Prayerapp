import type { Metadata, Viewport } from "next";
import { cache } from "react";
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
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RouteRuntimeBoundary } from "@/components/providers/RouteRuntimeBoundary";

const metadataDescriptions: Record<Locale, string> = {
  ar: "مواقيت الصلاة والجمعة والإعلانات والتبرعات ومعلومات المجتمع في دغندورف.",
  en: "Local prayer times, Jumu'ah, announcements, donations, and community information for Deggendorf.",
  de: "Lokale Gebetszeiten, Jumu'ah, Mitteilungen, Spenden und Gemeindeinformationen für Deggendorf.",
  tr: "Deggendorf için yerel namaz vakitleri, cuma, duyurular, bağışlar ve topluluk bilgileri.",
};

const resolveRequestLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get("locale")?.value;
  if (isLocale(storedLocale)) return storedLocale;

  const requestHeaders = await headers();
  const acceptLanguage = requestHeaders.get("accept-language");
  return detectSupportedLocale(acceptLanguage ? acceptLanguage.split(",") : []);
});

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
        <I18nProvider initialLocale={initialLocale}>
          <AuthProvider>
            <RouteRuntimeBoundary>{children}</RouteRuntimeBoundary>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
