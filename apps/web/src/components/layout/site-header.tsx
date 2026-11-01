import { Container } from "@/components/ui";
import { LanguageSwitcher } from "@/features/locale";
import { GuardedLink } from "@/features/leave-guard";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-strong bg-surface">
      <Container className="flex h-14 items-center justify-between">
        <GuardedLink
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-foreground"
        >
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src="logo-full.png"
            alt="ESG Report Online Logo"
            className="h-8 w-auto max-h-full object-contain"
          />
        </GuardedLink>
        <LanguageSwitcher />
      </Container>
    </header>
  );
}
