import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui";
import { ABOUT_PATH } from "@/features/about/constants";
import { LogoutButton } from "@/features/about-admin/components/logout-button";
import { isAdmin } from "@/server/admin/session";

export const metadata: Metadata = {
  title: "Quản trị nội dung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const signedIn = await isAdmin();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <Container className="flex min-h-14 items-center justify-between gap-4">
          <Link href="/quan-tri" className="font-bold text-primary-800">
            Quản trị nội dung · ESG Report Online
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href={ABOUT_PATH} className="text-muted hover:underline">
              Xem trang web
            </Link>
            {signedIn ? <LogoutButton /> : null}
          </div>
        </Container>
      </header>
      <main>
        <Container className="py-8">{children}</Container>
      </main>
    </div>
  );
}
