import { ArrowLeft, Leaf } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui";

export function AdminHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-control bg-primary-800 text-white">
              <Leaf aria-hidden className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-primary-900">
              ESGstudio<span className="text-primary-500">.</span>
            </span>
          </Link>
          <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
            Quản trị
          </span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary-700"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Về trang khảo sát
        </Link>
      </Container>
    </header>
  );
}
