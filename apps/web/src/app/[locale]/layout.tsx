import type { Metadata, Viewport } from "next";
// import { Be_Vietnam_Pro } from "next/font/google";
import { Noto_Sans, Noto_Sans_SC } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  HTML_LANG,
  I18nProvider,
  INDEXABLE_LOCALES,
  isLocale,
} from "@/features/locale";
import { loadMessages } from "@/features/locale/server";
import { NO_INDEX } from "@/lib/seo";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/site";

import "../globals.css";

// const beVietnamPro = Be_Vietnam_Pro({
//   subsets: ["vietnamese", "latin"],
//   weight: ["400", "500", "600", "700"],
//   variable: "--font-be-vietnam-pro",
//   display: "swap",
// });

const notoSans = Noto_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-noto-sans",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-noto-sans-sc",
});

const baseMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (isLocale(locale) && !INDEXABLE_LOCALES.includes(locale)) {
    return { ...baseMetadata, robots: NO_INDEX };
  }
  return baseMetadata;
}

export const viewport: Viewport = {
  themeColor: "#f5f6f1",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<LocaleLayoutProps>) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  return (
    <html
      lang={HTML_LANG[locale]}
      // className={beVietnamPro.variable}
      className={`${notoSans.variable} ${notoSansSC.variable}`}
    >
      <body className="min-h-screen">
        <I18nProvider messages={loadMessages(locale)}>{children}</I18nProvider>
      </body>
    </html>
  );
}
