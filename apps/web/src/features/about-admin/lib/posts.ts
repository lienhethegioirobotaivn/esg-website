import type { Post } from "@/features/about/types";

export interface ApiPost extends Omit<Post, "isSample" | "coverUrl" | "body"> {
  coverUrl: string;
}

export interface ApiPostSummary extends ApiPost {
  updatedAt: string;
}

export interface ApiPostDetail extends ApiPost {
  body: Post["body"];
}

export function toPost(detail: ApiPostDetail): Post {
  return {
    ...detail,
    coverUrl: detail.coverUrl === "" ? null : detail.coverUrl,
    isSample: false,
  };
}
