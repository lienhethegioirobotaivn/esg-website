import { LocaleLink as Link } from "@/features/locale";

import { postPath } from "../constants";
import type { Post } from "../types";
import { Cover } from "./cover";
import { LikeButton } from "./like-button";
import { RichContent } from "./rich-content";
import { ShareBar } from "./share-bar";
import { Tag } from "./tag";

interface ArticleViewProps {
  post: Post;
  related: Post[];
}

export function ArticleView({ post, related }: ArticleViewProps) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <article className="min-w-0">
        <Tag>{post.category}</Tag>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-primary-800">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {post.author} <span aria-hidden>•</span> {post.readMinutes} phút đọc
        </p>
        {post.isSample ? (
          <p className="mt-1 text-sm italic text-subtle">Bài viết minh họa</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3">
          <ShareBar title={post.title} />
          <LikeButton section={post.section} slug={post.slug} likes={post.likes} />
        </div>

        <p className="mt-6 text-xl font-bold leading-relaxed">{post.summary}</p>

        <Cover post={post} className="mt-6 aspect-[2.7/1]" />

        <RichContent doc={post.body} className="mt-6" />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3">
          <LikeButton section={post.section} slug={post.slug} likes={post.likes} />
          <ShareBar title={post.title} />
        </div>
      </article>

      {related.length > 0 ? (
        <aside className="lg:border-l lg:border-border lg:pl-8">
          <h2 className="text-xl font-bold text-primary-800">
            Bài viết liên quan
          </h2>
          <ul className="mt-4 space-y-6">
            {related.map((item) => (
              <li key={item.id} className="space-y-2.5">
                <Link
                  href={postPath(item.section, item.slug)}
                  tabIndex={-1}
                  aria-hidden
                >
                  <Cover post={item} />
                </Link>
                <Link
                  href={postPath(item.section, item.slug)}
                  className="line-clamp-3 font-bold leading-snug text-primary-700 underline underline-offset-2 hover:text-primary-900"
                >
                  {item.title}
                </Link>
                {item.isSample ? (
                  <p className="text-xs text-subtle">Nội dung minh họa</p>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}
