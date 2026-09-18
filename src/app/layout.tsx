import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/i18n/provider";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rutawaynow.com"),
  title: {
    default: "RutawayNow — Planeje suas viagens",
    template: "%s | RutawayNow",
  },
  description:
    "Planeje, organize e compartilhe seus roteiros de viagem com o RutawayNow.",
  openGraph: {
    siteName: "RutawayNow",
    title: "RutawayNow — Planeje suas viagens",
    description:
      "Planeje, organize e compartilhe seus roteiros de viagem com o RutawayNow.",
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh flex flex-col bg-slate-50 font-sans text-slate-900">
        <SessionProvider>
          <I18nProvider>{children}</I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
