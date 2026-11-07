import type { Metadata } from "next";

import { Container } from "@/components/ui";
import { ComingSoonDialog, CreditsPreview } from "@/features/carbon";

export const metadata: Metadata = {
  title: "Mua tín chỉ carbon",
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
