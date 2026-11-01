import { Container } from "@/components/ui";
import { LanguageSwitcher } from "@/features/locale";
import { GuardedLink } from "@/features/leave-guard";
import { HowItWorksLink } from "@/features/how-it-works";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-strong bg-surface">
      <Container className="relative flex min-h-14 flex-wrap items-center justify-between">
        <GuardedLink
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-foreground"
        >
          <img
            src="logo-full.png"
            alt="ESG Report Online Logo"
            className="h-8 w-auto max-h-full object-contain"
          />
        </GuardedLink>
        <div className="order-3 flex w-full items-center justify-center gap-3 pb-2 md:absolute md:left-1/2 md:order-none md:w-auto md:-translate-x-1/2 md:pb-0">
          <span className="text-sm font-medium text-primary">
            Hồ sơ doanh nghiệp
          </span>
          <span className="text-border-strong">|</span>
          <HowItWorksLink />
        </div>
        <LanguageSwitcher />
      </Container>
    </header>
  );
}
