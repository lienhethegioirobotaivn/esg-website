import type { Metadata, Viewport } from "next";
// import { Be_Vietnam_Pro } from "next/font/google";
import { Noto_Sans, Noto_Sans_SC } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "ESG Studio - Tạo hồ sơ ESG miễn phí",
    template: "%s | ESGstudio",
  },
  description: "Nền tảng khảo sát ESG nội bộ miễn phí dành cho doanh nghiệp.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f6f1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="vi"
      // className={beVietnamPro.variable}
      className={`${notoSans.variable} ${notoSansSC.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
