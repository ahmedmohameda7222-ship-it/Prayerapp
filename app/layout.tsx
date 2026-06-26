import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { getTextDirection } from "@/lib/i18n/direction";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/types";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";

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
    title: "Deggendorf Prayer",
    description: metadataDescriptions[locale],
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/assets/app-icon-main.png",
      apple: "/assets/app-icon-main.png",
    },
    appleWebApp: {
      capable: true,
      title: "Deggendorf Prayer",
      statusBarStyle: "black-translucent",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0e3d36",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function ServiceWorkerRegistration() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(error) { console.warn('Service worker registration failed', error); });
            });
          }
        `,
      }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = normalizeLocale(cookieStore.get("locale")?.value || DEFAULT_LOCALE);

  return (
    <html lang={initialLocale} dir={getTextDirection(initialLocale)} suppressHydrationWarning>
      <head>
        <ServiceWorkerRegistration />
      </head>
      <body>
        <I18nProvider initialLocale={initialLocale}>
          <AppPreferencesProvider><TimeFormatProvider>{children}</TimeFormatProvider></AppPreferencesProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
