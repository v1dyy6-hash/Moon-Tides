import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "🌙 Лунные Приливы — Moon Tides",
  description:
    "Веди фонарь-лодку сквозь бесконечную пещеру-море: лови жемчужины, лавируй между скал и медуз, восстанавливай маяк.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Moon Tides",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#02030f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="overscroll-none bg-[#02030f] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
