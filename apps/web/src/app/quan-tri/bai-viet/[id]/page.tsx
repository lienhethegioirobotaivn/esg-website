import { PostEditorPage } from "@/features/about-admin/components/post-editor-page";

export default async function EditPostRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostEditorPage key={id} id={encodeURIComponent(id)} />;
}
