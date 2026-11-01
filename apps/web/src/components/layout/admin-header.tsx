import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-strong bg-surface">
      <Container className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-lg font-bold text-foreground">
            ESGstudio
          </Link>
          <span className="border border-border px-2 py-0.5 text-xs text-muted">
            Quản trị
          </span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-primary-700 underline hover:text-primary-900"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Về trang chủ
        </Link>
      </Container>
    </header>
  );
}
