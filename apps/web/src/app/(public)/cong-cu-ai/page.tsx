import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui";
import { AiDataTool } from "@/features/ai-data";
import { getServerEnv } from "@/server/env";

export const metadata: Metadata = {
  title: "Công cụ dữ liệu thử bằng AI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AiToolsPage() {
  if (!getServerEnv().ENABLE_AI_TOOLS) {
    notFound();
  }

  return (
    <main>
      <Container className="py-6">
        <AiDataTool />
      </Container>
    </main>
  );
}
