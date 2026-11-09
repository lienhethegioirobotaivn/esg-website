import { LocaleLink as Link } from "@/features/locale";
import { cn } from "@/lib/cn";

import { postPath } from "../constants";
import type { Post } from "../types";
import { Cover } from "./cover";
import { Tag } from "./tag";

interface PostCardProps {
  post: Post;
  linkLabel?: string;
  size?: "md" | "lg";
  showTag?: boolean;
}

export function PostCard({
  post,
  linkLabel = "Xem bài viết",
  size = "md",
  showTag = true,
}: PostCardProps) {
  const href = postPath(post.section, post.slug);
  return (
    <article className="flex min-w-0 flex-col gap-2.5">
      <Link href={href} tabIndex={-1} aria-hidden>
        <Cover post={post} />
      </Link>
      {showTag ? (
        <div>
          <Tag>{post.category}</Tag>
        </div>
      ) : null}
      <h3
        className={cn(
          "font-bold leading-snug text-primary-800",
          size === "lg" ? "text-3xl" : "text-lg",
        )}
      >
        <Link href={href} className="hover:underline">
          {post.title}
        </Link>
      </h3>
      <p className="text-sm leading-relaxed text-muted">{post.summary}</p>
      <Link
        href={href}
        className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
      >
        {linkLabel}
      </Link>
    </article>
  );
}
