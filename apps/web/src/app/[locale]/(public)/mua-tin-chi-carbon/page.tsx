import type { Metadata } from "next";

import { NO_INDEX } from "@/lib/seo";

import { Container } from "@/components/ui";
import { ComingSoonDialog, CreditsPreview } from "@/features/carbon";

export const metadata: Metadata = {
  title: "Mua tín chỉ carbon",
  robots: NO_INDEX,
};

export default function CarbonCreditsPage() {
  return (
    <main>
      <Container className="py-8">
        <CreditsPreview />
      </Container>
      <ComingSoonDialog />
    </main>
  );
}
