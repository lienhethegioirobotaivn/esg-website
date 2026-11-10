import { redirect } from "next/navigation";

import { TranslationWarmup } from "@/features/about-admin/components/translation-warmup";
import { isAdmin } from "@/server/admin/session";

export const dynamic = "force-dynamic";

export default async function TranslationsAdminPage() {
  if (!(await isAdmin())) {
    redirect("/quan-tri");
  }
  return <TranslationWarmup />;
}
