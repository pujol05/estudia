import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/header/Header";
import "../globals.css";

import "flag-icons/css/flag-icons.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Estudia",
  description: "Study management web application",
};

// li diu a typescript quines dades rebra de rootlayout. (children, params)
type Props = {
  children: React.ReactNode; // React.ReactNode és un tipus que representa qualsevol cosa que es pugui renderitzar a React, com ara elements JSX, cadenes de text, nombres, fragments, etc.
  params: Promise<{ locale: string }>; //part de la url variable (promise -> dada per resoldre)
};

//transforma ["ca", "es", "en"] en [{locale: "ca"}, {locale: "es"}, {locale: "en"}] per a que nextjs pugui generar les rutes estàtiques de cada idioma.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // idioma dinamic amb i18n, amb el que es pot canviar l'idioma de la web segons el que es posi a la url. Per exemple: /ca, /es, /en .
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        { /* Els components React que ho necessiten poden accedir a les traduccions */ }
        <NextIntlClientProvider>
          <Header />

          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}