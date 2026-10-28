import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ESGstudio",
    template: "%s | ESGstudio",
  },
  description: "Nền tảng khảo sát ESG nội bộ miễn phí dành cho doanh nghiệp.",
};

export const viewport: Viewport = {
  themeColor: "#f5f6f1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
