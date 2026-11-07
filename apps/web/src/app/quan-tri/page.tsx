import { LoginForm } from "@/features/about-admin/components/login-form";
import { PostsTable } from "@/features/about-admin/components/posts-table";
import { getAdminPosts } from "@/features/about/lib/content";
import { isAboutBridgeConfigured } from "@/server/about/bridge";
import { isAdmin, isAdminConfigured } from "@/server/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  if (!(await isAdmin())) {
    return <LoginForm isConfigured={isAdminConfigured()} />;
  }
  let posts: Awaited<ReturnType<typeof getAdminPosts>> = [];
  let loadError: string | null = null;
  try {
    posts = await getAdminPosts();
  } catch (error) {
    console.error(error);
    loadError = "Không đọc được danh sách bài viết từ Google Sheet.";
  }
  return (
    <>
      {loadError ? (
        <p role="alert" className="mb-4 text-sm text-danger-600">
          {loadError}
        </p>
      ) : null}
      <PostsTable posts={posts} isConfigured={isAboutBridgeConfigured()} />
    </>
  );
}
