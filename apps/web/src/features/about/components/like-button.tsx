"use client";

import { Heart } from "lucide-react";

import { cn } from "@/lib/cn";

import { useLiked } from "../hooks/use-liked";

interface LikeButtonProps {
  slug: string;
  baseLikes: number;
}

export function LikeButton({ slug, baseLikes }: LikeButtonProps) {
  const [liked, toggle] = useLiked(slug);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-surface-muted"
    >
      <Heart
        aria-hidden
        className={cn(
          "size-5",
          liked ? "fill-danger-600 text-danger-600" : "text-foreground",
        )}
      />
      Thả tim
      <span className="tabular-nums">{baseLikes + (liked ? 1 : 0)}</span>
    </button>
  );
}
