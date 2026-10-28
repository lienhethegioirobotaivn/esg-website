import { Leaf, Settings } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-control bg-primary-800 text-white">
            <Leaf aria-hidden className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight text-primary-900">
            ESGstudio<span className="text-primary-500">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700">
            Miễn phí
          </span>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary-700"
          >
            <Settings aria-hidden className="size-4" />
            Quản trị
          </Link>
        </div>
      </Container>
    </header>
  );
}
