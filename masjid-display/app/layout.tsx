import type { Metadata } from "next";
import { Carlito, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import "./tv-v2.css";
import "./tv-legibility.css";

// Calibri is proprietary: use the user's installed Calibri when available,
// otherwise serve open-licensed, build-time self-hosted close alternatives.
const carlito = Carlito({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-carlito",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-noto-arabic",
});

export const metadata: Metadata = {
  title: "Prayerapp Masjid Display",
  description: "Read-only mosque TV display",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${carlito.variable} ${notoArabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
