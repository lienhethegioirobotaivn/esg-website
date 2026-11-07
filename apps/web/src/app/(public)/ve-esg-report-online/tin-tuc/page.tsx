import type { Metadata } from "next";

import { NewsView, getPosts } from "@/features/about";

export const metadata: Metadata = {
  title: "Tin tức",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await getPosts("tin-tuc");
  return <NewsView posts={posts} />;
}
