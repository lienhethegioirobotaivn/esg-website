import type { Metadata } from "next";

import { NO_INDEX } from "@/lib/seo";

import { Container } from "@/components/ui";
import { ComingSoonDialog, ForestryPreview } from "@/features/carbon";

export const metadata: Metadata = {
  title: "Trồng rừng",
  robots: NO_INDEX,
};

export default function ForestryPage() {
  return (
    <main>
      <Container className="py-8">
        <ForestryPreview />
      </Container>
      <ComingSoonDialog />
    </main>
  );
}
