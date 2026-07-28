import type { Metadata } from "next";
import { Geist_Mono, Fraunces, Work_Sans } from "next/font/google";
import { SiteFooter } from "../components/layout/SiteFooter";
import { SiteHeader } from "../components/layout/SiteHeader";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Perfumas — Perfumería de autor en Bogotá",
    template: "%s | Perfumas",
  },
  description:
    "Crea tu fragancia personalizada, compra insumos para emprendedores, ambientadores y accesorios. Perfumería familiar en Bogotá desde 2015.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://perfumas.com.co"),
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Perfumas",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${workSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-wine-950 text-bone font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
