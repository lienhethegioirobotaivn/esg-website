"use client";

import Link from "next/link";
import { useState } from "react";

import { NEWS_CATEGORIES, NEWS_PAGE_SIZE, postPath } from "../constants";
import { matchesQuery, pageCount } from "../lib/search";
import type { Post } from "../types";
import { FilterChips } from "./filter-chips";
import { Pagination } from "./pagination";
import { PostCard } from "./post-card";
import { SearchBox } from "./search-box";

export function NewsView({ posts }: { posts: Post[] }) {
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
  const popular = isFiltering ? [] : posts.filter((post) => post.popular).slice(0, 5);
  const spotlight = isFiltering ? [] : posts.filter((post) => post.spotlight).slice(0, 3);
  const featuredIds = new Set(featured.map((post) => post.id));
  const rest = filtered.filter((post) => !featuredIds.has(post.id));
  const pages = pageCount(rest.length, NEWS_PAGE_SIZE);
  const currentPage = Math.min(page, pages);
  const visible = rest.slice(
    (currentPage - 1) * NEWS_PAGE_SIZE,
    currentPage * NEWS_PAGE_SIZE,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-bold text-primary-800">
          Tin tức &amp; kiến thức ESG
        </h1>
        <SearchBox
          label="Tìm bài viết"
          placeholder="Tìm bài viết..."
          value={query}
          onChange={resetPage(setQuery)}
        />
      </div>

      <div className="mt-4 border-b border-border pb-3">
        <FilterChips
          options={NEWS_CATEGORIES}
          value={category}
          onChange={resetPage(setCategory)}
        />
      </div>

      {main ? (
        <div className="mt-6 grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)]">
          <PostCard post={main} size="lg" />
          <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
            {side.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <aside className="lg:border-l lg:border-border lg:pl-8">
            <h2 className="text-xl font-bold text-primary-800">Đọc nhiều</h2>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {popular.map((post) => (
                <li key={post.id}>
                  <Link
                    href={postPath(post.section, post.slug)}
                    className="block py-3 font-semibold leading-snug hover:text-primary-700"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs italic text-subtle">Nội dung minh họa</p>
          </aside>
        </div>
      ) : null}

      <h2 className="mt-8 text-2xl font-bold text-primary-800">
        {isFiltering ? "Kết quả" : "Mới cập nhật"}
      </h2>

      {visible.length > 0 ? (
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-card border border-dashed border-border-strong p-8 text-center text-sm text-muted">
          {isFiltering
            ? "Không tìm thấy bài viết phù hợp."
            : "Chưa có bài viết nào được đăng."}
        </p>
      )}

      {spotlight.length > 0 ? (
        <section className="mt-10 border-t border-border pt-6">
          <h2 className="text-2xl font-bold text-primary-800">
            Chuyên đề nổi bật
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3 md:divide-x md:divide-border">
            {spotlight.map((post) => (
              <li key={post.id} className="md:px-6 md:first:pl-0">
                <Link
                  href={postPath(post.section, post.slug)}
                  className="font-medium hover:text-primary-700"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Pagination
        page={currentPage}
        pageCount={pages}
        onChange={setPage}
        moreLabel="Xem thêm bài viết"
      />
    </div>
  );
}
