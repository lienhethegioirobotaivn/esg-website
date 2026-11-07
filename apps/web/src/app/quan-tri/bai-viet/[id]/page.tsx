import { notFound, redirect } from "next/navigation";

import { PostEditor } from "@/features/about-admin/components/post-editor";
import { getAdminPosts } from "@/features/about/lib/content";
import { isAdmin } from "@/server/admin/session";

export const dynamic = "force-dynamic";

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  if (!(await isAdmin())) {
    redirect("/quan-tri");
  }
  const { id } = await params;
  const posts = await getAdminPosts();
  const post = posts.find((item) => item.id === decodeURIComponent(id));
  if (!post) {
    notFound();
  }
  return <PostEditor key={post.id} initial={post} />;
}
