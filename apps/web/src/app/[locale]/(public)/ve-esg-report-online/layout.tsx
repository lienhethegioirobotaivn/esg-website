import type { ReactNode } from "react";

import { Container } from "@/components/ui";
import { SectionTabs } from "@/features/about";

export default function AboutLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <Container className="py-4">
        <SectionTabs />
        <div className="py-8">{children}</div>
      </Container>
    </main>
  );
}
