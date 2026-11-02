import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminHeader } from "@/components/layout";

export const metadata: Metadata = {
  title: "Quản trị",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
