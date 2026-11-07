import Link from "next/link";

import { postPath } from "../constants";
import type { Post } from "../types";
import { Cover } from "./cover";
import { LikeButton } from "./like-button";
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

        <div className="mt-6 space-y-4 leading-relaxed">
          {post.body.map((block, index) => {
            if (block.type === "heading") {
              return (
                <h2
                  key={index}
                  className="pt-2 text-2xl font-bold text-primary-700"
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === "callout") {
              return (
                <aside
                  key={index}
                  className="rounded-card border border-primary-200 bg-primary-100 p-5"
                >
                  <h3 className="text-xl font-bold text-primary-800">
                    {block.title}
                  </h3>
                  <p className="mt-2 text-sm text-primary-900">{block.text}</p>
                </aside>
              );
            }
            return (
              <p key={index} className="text-[0.9375rem] text-foreground">
                {block.text}
              </p>
            );
          })}
        </div>

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
                  className="block font-bold leading-snug text-primary-700 underline underline-offset-2 hover:text-primary-900"
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
