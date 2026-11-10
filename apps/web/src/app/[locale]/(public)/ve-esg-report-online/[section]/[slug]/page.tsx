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
import { getLocale, getT } from "@/features/locale/server";

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
  const locale = await getLocale();
  const post = await getPost(section, slug, locale);
  return post ? postMetadata(post, locale) : {};
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { section, slug } = await params;
  if (!isPostSection(section)) {
    notFound();
  }
  const locale = await getLocale();
  const post = await getPost(section, slug, locale);
  if (!post) {
    notFound();
  }
  const related = pickRelatedPosts(post, await getPosts(section, locale));

  return (
    <>
      <JsonLd data={postJsonLd(post, locale, await getT())} />
      <ArticleView post={post} related={related} />
    </>
  );
}
