import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prayerapp Masjid Display",
  description: "Read-only mosque TV display",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
