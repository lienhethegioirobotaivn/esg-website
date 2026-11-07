import { redirect } from "next/navigation";

import { PostEditor } from "@/features/about-admin/components/post-editor";
import { isAdmin } from "@/server/admin/session";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  if (!(await isAdmin())) {
    redirect("/quan-tri");
  }
  return <PostEditor initial={null} />;
}
