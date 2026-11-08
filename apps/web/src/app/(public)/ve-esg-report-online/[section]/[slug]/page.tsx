import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ArticleView,
  getPost,
  getPosts,
  isPostSection,
  pickRelatedPosts,
  postJsonLd,
  postMetadata,
} from "@/features/about";
import { JsonLd } from "@/components/seo/json-ld";

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
  return post ? postMetadata(post) : {};
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

  return (
    <>
      <JsonLd data={postJsonLd(post)} />
      <ArticleView post={post} related={related} />
    </>
  );
}
