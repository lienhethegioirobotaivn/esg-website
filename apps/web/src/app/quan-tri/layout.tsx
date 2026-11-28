import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/features/backoffice/components/admin-shell";

import "../globals.css";

export const metadata: Metadata = {
  title: "Quản trị · ESG Report Online",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.ico" },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
