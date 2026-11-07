"use client";

import { useState } from "react";

import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENTS_PAGE_SIZE } from "../constants";
import { matchesQuery, pageCount } from "../lib/search";
import type { Post } from "../types";
import { FilterChips } from "./filter-chips";
import { Pagination } from "./pagination";
import { PostCard } from "./post-card";
import { SearchBox } from "./search-box";

export function AchievementsView({ posts }: { posts: Post[] }) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const isFiltering = category !== "" || query.trim() !== "";
  const filtered = posts.filter(
    (post) =>
      (category === "" || post.category === category) &&
      matchesQuery(post, query),
  );
  const featured = isFiltering ? [] : posts.filter((post) => post.featured).slice(0, 3);
  const featuredIds = new Set(featured.map((post) => post.id));
  const rest = filtered.filter((post) => !featuredIds.has(post.id));
  const pages = pageCount(rest.length, ACHIEVEMENTS_PAGE_SIZE);
  const currentPage = Math.min(page, pages);
  const visible = rest.slice(
    (currentPage - 1) * ACHIEVEMENTS_PAGE_SIZE,
    currentPage * ACHIEVEMENTS_PAGE_SIZE,
  );
  const [main, ...side] = featured;

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          options={ACHIEVEMENT_CATEGORIES}
          value={category}
          onChange={resetPage(setCategory)}
        />
        <SearchBox
          label="Tìm hoạt động"
          placeholder="Tìm hoạt động..."
          value={query}
          onChange={resetPage(setQuery)}
        />
      </div>

      <h2 className="mt-8 text-3xl font-bold text-primary-800">
        Hoạt động &amp; dấu mốc
      </h2>

      {main ? (
        <div className="mt-6 grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <PostCard post={main} size="lg" />
          <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
            {side.map((post) => (
              <PostCard key={post.id} post={post} showTag={false} />
            ))}
          </div>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : !main ? (
        <p className="mt-8 rounded-card border border-dashed border-border-strong p-8 text-center text-sm text-muted">
          {isFiltering
            ? "Không tìm thấy hoạt động phù hợp."
            : "Chưa có hoạt động nào được đăng."}
        </p>
      ) : null}

      <Pagination
        page={currentPage}
        pageCount={pages}
        onChange={setPage}
        moreLabel="Xem thêm hoạt động"
      />
    </div>
  );
}
