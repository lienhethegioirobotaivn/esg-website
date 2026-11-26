import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "../src/database/migrate.js";
import { FilesService } from "../src/files/files.service.js";
import { JobScheduler } from "../src/jobs/job-scheduler.js";
import { adminSession } from "./helpers/admin-session.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;
let testApp: TestApp;
let storageDir: string;
let editor: string;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function api() {
  return request(testApp.app.getHttpServer());
}

async function rows<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await database.pool.query<T>(sql, params)).rows;
}

function paragraph(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function image(src: string) {
  return { type: "image", attrs: { src, alt: "Ảnh", caption: "", align: "center", width: 100 } };
}

function postInput(overrides: Record<string, unknown> = {}) {
  return {
    section: "tin-tuc",
    slug: "bai-thu",
    category: "Tin ESG",
    title: "Bài thử nghiệm",
    summary: "Tóm tắt bài thử",
    coverUrl: "",
    author: "Ban biên tập",
    readMinutes: 3,
    publishedAt: "2026-11-01",
    featured: false,
    popular: false,
    spotlight: false,
    status: "published",
    body: { type: "doc", content: [paragraph("Nội dung đầu tiên")] },
    ...overrides,
  };
}

async function createPost(overrides: Record<string, unknown> = {}) {
  const response = await api()
    .post("/api/v1/admin/posts")
    .set("Cookie", editor)
    .send(postInput(overrides))
    .expect(201);
  return response.body as { id: string; slug: string; coverUrl: string };
}

async function uploadImage(): Promise<{ id: string; url: string }> {
  const response = await api()
    .post("/api/v1/admin/upload")
    .set("Cookie", editor)
    .attach("image", PNG, { filename: "anh.png" })
    .expect(201);
  return response.body as { id: string; url: string };
}

async function fileState(id: string) {
  const [row] = await rows<{ deleted: boolean; referenced: boolean }>(
    "select deleted_at is not null as deleted, referenced_at is not null as referenced from files where id = $1",
    [id],
  );
  return row;
}

async function attachments(postId: string): Promise<string[]> {
  const result = await rows<{ file_id: string }>("select file_id from post_files where post_id = $1", [postId]);
  return result.map((row) => row.file_id).sort();
}

beforeAll(async () => {
  storageDir = await mkdtemp(join(tmpdir(), "esg-content-"));
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
  testApp = await createTestApp(database.url, { STORAGE_DIR: storageDir });
});

afterAll(async () => {
  await testApp.close();
  await database.drop();
  await rm(storageDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetState(database.pool);
  editor = await adminSession(testApp.app, database.pool, "content");
});

describe("quản trị bài viết", () => {
  it("chặn người chưa đăng nhập và vai trò không đủ quyền", async () => {
    await api().get("/api/v1/admin/posts").expect(401);
    await api().post("/api/v1/admin/posts").send(postInput()).expect(401);
    const ops = await adminSession(testApp.app, database.pool, "ops");
    await api().post("/api/v1/admin/posts").set("Cookie", ops).send(postInput()).expect(403);
    await api().post("/api/v1/admin/upload").set("Cookie", ops).attach("image", PNG, "a.png").expect(403);
    await api().put("/api/v1/admin/stats").set("Cookie", ops).send({ items: [] }).expect(403);

    const admin = await adminSession(testApp.app, database.pool, "admin");
    await api().post("/api/v1/admin/posts").set("Cookie", admin).send(postInput()).expect(201);
  });

  it("báo lỗi theo từng trường và không tạo bài", async () => {
    const missing = await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput({ title: "", slug: "Có Dấu" }))
      .expect(400);
    expect(missing.body.error.code).toBe("invalid_post");
    expect(Object.keys(missing.body.error.fields)).toEqual(expect.arrayContaining(["title", "slug"]));

    const date = await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput({ publishedAt: "2026-02-30" }))
      .expect(400);
    expect(date.body.error.fields.publishedAt).toBeDefined();
    expect(await rows("select id from posts")).toHaveLength(0);
  });

  it("slug chỉ trùng trong cùng một mục", async () => {
    await createPost();
    const clash = await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput())
      .expect(409);
    expect(clash.body.error.code).toBe("slug_taken");
    expect(clash.body.error.fields.slug).toBeDefined();

    await createPost({ section: "thanh-tuu" });
    expect(await rows("select id from posts")).toHaveLength(2);
  });

  it("sửa một phần, lọc, xóa và ghi nhật ký", async () => {
    const created = await createPost({ status: "draft" });

    await api().patch(`/api/v1/admin/posts/${created.id}`).set("Cookie", editor).send({}).expect(400);
    const updated = await api()
      .patch(`/api/v1/admin/posts/${created.id}`)
      .set("Cookie", editor)
      .send({ title: "Tiêu đề mới", status: "published" })
      .expect(200);
    expect(updated.body).toMatchObject({
      title: "Tiêu đề mới",
      status: "published",
      summary: "Tóm tắt bài thử",
      publishedAt: "2026-11-01",
      readMinutes: 3,
    });
    expect(updated.body.body.content).toHaveLength(1);

    const found = await api()
      .get("/api/v1/admin/posts?status=published&q=mới")
      .set("Cookie", editor)
      .expect(200);
    expect(found.body.total).toBe(1);

    await api().delete(`/api/v1/admin/posts/${created.id}`).set("Cookie", editor).expect(204);
    await api().get(`/api/v1/admin/posts/${created.id}`).set("Cookie", editor).expect(404);
    const actions = await rows<{ action: string }>(
      "select action from audit_logs where entity = 'post' order by created_at",
    );
    expect(actions.map((row) => row.action)).toEqual(["post.create", "post.update", "post.delete"]);
  });

  it("cho phép thân yêu cầu lớn hơn 1 MB riêng ở bài viết", async () => {
    const padding = "x".repeat(1_300_000);
    await createPost({ body: { type: "doc", content: [paragraph("Ngắn")], ignored: padding } });

    await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput({ slug: "qua-lon", ignored: "x".repeat(2_200_000) }))
      .expect(413);
    await api().put("/api/v1/admin/stats").set("Cookie", editor).send({ items: [], padding }).expect(413);

    const long = await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput({ slug: "noi-dung-dai", body: { type: "doc", content: [paragraph("a".repeat(420_000))] } }))
      .expect(400);
    expect(long.body.error.fields.body).toBeDefined();
  });
});

describe("bài viết công khai", () => {
  it("chỉ trả bài đã đăng, mới nhất trước, lọc theo mục", async () => {
    await createPost({ slug: "cu", publishedAt: "2026-01-05" });
    await createPost({ slug: "moi", publishedAt: "2026-10-05" });
    await createPost({ slug: "nhap", status: "draft" });
    await createPost({ section: "thanh-tuu", slug: "giai-thuong" });

    const news = await api().get("/api/v1/posts?section=tin-tuc").expect(200);
    expect(news.body.total).toBe(2);
    expect(news.body.posts.map((post: { slug: string }) => post.slug)).toEqual(["moi", "cu"]);
    expect(news.body.posts[0]).not.toHaveProperty("body");
    expect(news.headers["cache-control"]).toContain("max-age=60");

    const all = await api().get("/api/v1/posts").expect(200);
    expect(all.body.total).toBe(3);

    const detail = await api().get("/api/v1/posts/tin-tuc/moi").expect(200);
    expect(detail.body).toMatchObject({ slug: "moi", publishedAt: "2026-10-05", likes: 0 });
    expect(detail.body.body.type).toBe("doc");

    await api().get("/api/v1/posts/tin-tuc/nhap").expect(404);
    await api().get("/api/v1/posts/thanh-tuu/moi").expect(404);
    await api().get("/api/v1/posts/khac/moi").expect(404);
    await api().get("/api/v1/posts?locale=de").expect(400);
  });

  it("mỗi trình duyệt chỉ tính một lượt thích", async () => {
    const post = await createPost();
    const draft = await createPost({ slug: "nhap", status: "draft" });
    await database.pool.query("update posts set like_base = 10 where id = $1", [post.id]);
    const url = `/api/v1/posts/${post.id}/like`;

    const first = await api().post(url).expect(200);
    expect(first.body).toEqual({ liked: true, likes: 11 });
    const cookie = (first.headers["set-cookie"] as unknown as string[])[0] ?? "";
    expect(cookie).toContain("esg-viewer=");
    expect(cookie).toContain("HttpOnly");
    const viewer = cookie.split(";")[0] ?? "";

    const repeat = await api().post(url).set("Cookie", viewer).expect(200);
    expect(repeat.body.likes).toBe(11);
    const other = await api().post(url).expect(200);
    expect(other.body.likes).toBe(12);

    const removed = await api().delete(url).set("Cookie", viewer).expect(200);
    expect(removed.body).toEqual({ liked: false, likes: 11 });
    const anonymous = await api().delete(url).expect(200);
    expect(anonymous.body.likes).toBe(11);

    await api().post(`/api/v1/posts/${draft.id}/like`).expect(404);
    await api().post("/api/v1/posts/khong-phai-uuid/like").expect(400);
    const keys = await rows<{ voter_key_hash: string }>("select voter_key_hash from post_likes");
    expect(keys).toHaveLength(1);
    expect(viewer).not.toContain(keys[0]?.voter_key_hash ?? "-");
  });

  it("giới hạn số lượt thích một bài từ cùng địa chỉ", async () => {
    const post = await createPost();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await api().post(`/api/v1/posts/${post.id}/like`).expect(200);
    }
    const blocked = await api().post(`/api/v1/posts/${post.id}/like`).expect(429);
    expect(blocked.body.error.code).toBe("rate_limited");
  });

  it("xóa bài thì xóa luôn lượt thích", async () => {
    const post = await createPost();
    await api().post(`/api/v1/posts/${post.id}/like`).expect(200);
    await api().delete(`/api/v1/admin/posts/${post.id}`).set("Cookie", editor).expect(204);
    expect(await rows("select 1 from post_likes")).toHaveLength(0);
  });
});

describe("ảnh bài viết", () => {
  it("chỉ nhận ảnh đúng loại và đúng cỡ", async () => {
    const wrong = await api()
      .post("/api/v1/admin/upload")
      .set("Cookie", editor)
      .attach("image", Buffer.from("<svg></svg>"), { filename: "a.png", contentType: "image/png" })
      .expect(400);
    expect(wrong.body.error.code).toBe("invalid_file");

    await api()
      .post("/api/v1/admin/upload")
      .set("Cookie", editor)
      .attach("image", Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]), "to.png")
      .expect(413);
    await api().post("/api/v1/admin/upload").set("Cookie", editor).expect(400);
    expect(await rows("select 1 from files")).toHaveLength(0);
  });

  it("phục vụ ảnh công khai nhưng không lộ loại tệp khác", async () => {
    const uploaded = await uploadImage();
    expect(uploaded.url).toBe(`/api/v1/files/${uploaded.id}`);

    const served = await api().get(uploaded.url).expect(200);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["cache-control"]).toContain("immutable");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.from(served.body as Buffer).equals(PNG)).toBe(true);
    await api().get(uploaded.url).set("If-None-Match", served.headers["etag"] ?? "").expect(304);

    const evidence = await testApp.app.get(FilesService).upload({
      buffer: PNG,
      kind: "evidence",
      ownerUserId: null,
      originalName: "mc.png",
    });
    await api().get(`/api/v1/files/${evidence.id}`).expect(404);
    await api().get("/api/v1/files/khong-co").expect(404);
  });

  it("gắn ảnh vào bài, gỡ thì đánh dấu xóa, dùng lại thì khôi phục", async () => {
    const cover = await uploadImage();
    const inline = await uploadImage();
    const post = await createPost({
      coverUrl: cover.url,
      body: { type: "doc", content: [paragraph("Có ảnh"), image(inline.url)] },
    });
    expect(post.coverUrl).toBe(cover.url);
    expect(await attachments(post.id)).toEqual([cover.id, inline.id].sort());
    expect(await fileState(inline.id)).toEqual({ deleted: false, referenced: true });

    const patch = (changes: Record<string, unknown>) =>
      api().patch(`/api/v1/admin/posts/${post.id}`).set("Cookie", editor).send(changes);

    await patch({ body: { type: "doc", content: [paragraph("Bỏ ảnh")] } }).expect(200);
    expect(await attachments(post.id)).toEqual([cover.id]);
    expect((await fileState(inline.id))?.deleted).toBe(true);
    await api().get(inline.url).expect(404);

    await patch({ body: { type: "doc", content: [image(inline.url)] } }).expect(200);
    expect((await fileState(inline.id))?.deleted).toBe(false);
    await api().get(inline.url).expect(200);

    await patch({ coverUrl: "https://example.com/bia.png" }).expect(200);
    expect((await fileState(cover.id))?.deleted).toBe(true);
    const [stored] = await rows<{ cover_url: string; cover_file_id: string | null }>(
      "select cover_url, cover_file_id from posts where id = $1",
      [post.id],
    );
    expect(stored).toEqual({ cover_url: "https://example.com/bia.png", cover_file_id: null });

    await api().delete(`/api/v1/admin/posts/${post.id}`).set("Cookie", editor).expect(204);
    expect((await fileState(inline.id))?.deleted).toBe(true);
    expect(await rows("select 1 from post_files")).toHaveLength(0);
  });

  it("ảnh còn bài khác dùng thì được giữ lại", async () => {
    const shared = await uploadImage();
    const first = await createPost({ slug: "mot", coverUrl: shared.url });
    await createPost({ slug: "hai", coverUrl: shared.url });

    await api().delete(`/api/v1/admin/posts/${first.id}`).set("Cookie", editor).expect(204);
    expect((await fileState(shared.id))?.deleted).toBe(false);
    await api().get(shared.url).expect(200);
  });

  it("từ chối ảnh không tồn tại, sai loại hoặc đã xóa quá lâu, và hoàn tác cả bài", async () => {
    const missing = await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput({ body: { type: "doc", content: [image("/api/v1/files/0192f3a0-0000-7000-8000-000000000000")] } }))
      .expect(400);
    expect(missing.body.error.code).toBe("invalid_image");
    expect(missing.body.error.fields.body).toBeDefined();

    const evidence = await testApp.app.get(FilesService).upload({
      buffer: PNG,
      kind: "evidence",
      ownerUserId: null,
      originalName: "mc.png",
    });
    await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput({ coverUrl: `/api/v1/files/${evidence.id}` }))
      .expect(400);

    const old = await uploadImage();
    await database.pool.query("update files set deleted_at = now() - interval '7 days' where id = $1", [old.id]);
    await api()
      .post("/api/v1/admin/posts")
      .set("Cookie", editor)
      .send(postInput({ coverUrl: old.url }))
      .expect(400);

    expect(await rows("select 1 from posts")).toHaveLength(0);
    expect(await rows("select 1 from post_files")).toHaveLength(0);
  });

  it("việc nền dọn ảnh mồ côi và ảnh tải lên không dùng", async () => {
    const orphan = await uploadImage();
    const used = await uploadImage();
    const unused = await uploadImage();
    const post = await createPost({ coverUrl: orphan.url, body: { type: "doc", content: [image(used.url)] } });
    await database.pool.query("delete from post_files where post_id = $1 and file_id = $2", [post.id, orphan.id]);
    await database.pool.query("update files set referenced_at = now() - interval '2 hours' where referenced_at is not null");
    await database.pool.query("update files set created_at = now() - interval '2 days' where id = $1", [unused.id]);

    const scheduler = testApp.app.get(JobScheduler);
    expect(await scheduler.runOnce("cleanup-post-images")).toBe("ran");
    expect((await fileState(orphan.id))?.deleted).toBe(true);
    expect((await fileState(used.id))?.deleted).toBe(false);
    expect((await fileState(unused.id))?.deleted).toBe(false);

    expect(await scheduler.runOnce("cleanup-orphan-files")).toBe("ran");
    expect((await fileState(unused.id))?.deleted).toBe(true);
    expect((await fileState(used.id))?.deleted).toBe(false);
  });
});

describe("số liệu thành tựu", () => {
  it("lưu, đọc công khai và kiểm tra dữ liệu", async () => {
    const empty = await api().get("/api/v1/stats").expect(200);
    expect(empty.body).toEqual({ items: [] });

    const items = [{ value: "120+", label: "Doanh nghiệp tham gia" }];
    const saved = await api().put("/api/v1/admin/stats").set("Cookie", editor).send({ items }).expect(200);
    expect(saved.body.items).toEqual(items);
    expect(saved.body.updatedAt).toEqual(expect.any(String));

    const read = await api().get("/api/v1/stats").expect(200);
    expect(read.body).toEqual({ items });
    const admin = await api().get("/api/v1/admin/stats").set("Cookie", editor).expect(200);
    expect(admin.body.items).toEqual(items);

    const invalid = await api()
      .put("/api/v1/admin/stats")
      .set("Cookie", editor)
      .send({ items: Array.from({ length: 9 }, () => items[0]) })
      .expect(400);
    expect(invalid.body.error.code).toBe("invalid_stats");
    expect(await rows("select 1 from audit_logs where action = 'stats.update'")).toHaveLength(1);
  });
});
