import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deggendorf Prayer",
  description: "Local prayer times, Jumu'ah, announcements, donations, and community information for Deggendorf.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
