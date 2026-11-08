import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ArticleView,
  getPost,
  getPosts,
  isPostSection,
  pickRelatedPosts,
} from "@/features/about";

export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: Promise<{ section: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { section, slug } = await params;
  if (!isPostSection(section)) {
    return {};
  }
  const post = await getPost(section, slug);
  return post ? { title: post.title, description: post.summary } : {};
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { section, slug } = await params;
  if (!isPostSection(section)) {
    notFound();
  }
  const post = await getPost(section, slug);
  if (!post) {
    notFound();
  }
  const related = pickRelatedPosts(post, await getPosts(section));

  return <ArticleView post={post} related={related} />;
}
