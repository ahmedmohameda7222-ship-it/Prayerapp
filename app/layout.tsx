import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { TimeFormatProvider } from "@/components/providers/TimeFormatProvider";

export const metadata: Metadata = {
  title: "Deggendorf Prayer",
  description: "Local prayer times, Jumu'ah, announcements, donations, and community information for Deggendorf.",
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

export const viewport: Viewport = {
  themeColor: "#0e3d36",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <head>
        <ServiceWorkerRegistration />
      </head>
      <body>
        <I18nProvider>
          <TimeFormatProvider>{children}</TimeFormatProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
