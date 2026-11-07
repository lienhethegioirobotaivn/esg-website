import {
  Droplets,
  FileText,
  Handshake,
  Landmark,
  Leaf,
  Newspaper,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

import type { Post } from "../types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Kiến thức ESG": FileText,
  "Môi trường": Leaf,
  "Xã hội": Users,
  "Quản trị": Landmark,
  "Thị trường & chính sách": Droplets,
  "Sự kiện": Handshake,
  "Dấu mốc": Newspaper,
  "Giải thưởng & ghi nhận": Trophy,
};

const TONES = [
  "from-primary-200 to-primary-400",
  "from-primary-100 to-primary-300",
  "from-primary-300 to-primary-500",
  "from-primary-200 to-primary-500",
] as const;

function toneIndex(slug: string): number {
  let sum = 0;
  for (const char of slug) {
    sum += char.charCodeAt(0);
  }
  return sum % TONES.length;
}

interface CoverProps {
  post: Pick<Post, "slug" | "title" | "category" | "coverUrl">;
  className?: string;
}

export function Cover({ post, className }: CoverProps) {
  if (post.coverUrl) {
    return (
      <div
        role="img"
        aria-label={post.title}
        style={{ backgroundImage: `url("${post.coverUrl}")` }}
        className={cn(
          "aspect-video w-full rounded-card bg-surface-muted bg-cover bg-center",
          className,
        )}
      />
    );
  }
  const Icon = CATEGORY_ICONS[post.category] ?? FileText;
  return (
    <div
      aria-hidden
      className={cn(
        "flex aspect-video w-full items-center justify-center rounded-card bg-linear-to-br text-white/80",
        TONES[toneIndex(post.slug)],
        className,
      )}
    >
      <Icon className="size-12" strokeWidth={1.25} />
    </div>
  );
}
