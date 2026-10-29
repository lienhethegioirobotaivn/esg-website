import { Leaf } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui";
import { LanguageSwitcher } from "@/features/locale";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-control bg-primary-800 text-white">
            <Leaf aria-hidden className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight text-primary-900">
            ESGstudio<span className="text-primary-500">.</span>
          </span>
        </Link>
        <LanguageSwitcher />
      </Container>
    </header>
  );
}
