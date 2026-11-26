import { postImageId, type RichDoc } from "@esg/shared/node";

export interface PostImageRef {
  fileId: string;
  field: "coverUrl" | "body";
}

function walk(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, found);
    }
    return;
  }
  if (typeof node !== "object" || node === null) {
    return;
  }
  const record = node as Record<string, unknown>;
  if (record["type"] === "image") {
    const attrs = record["attrs"];
    if (typeof attrs === "object" && attrs !== null) {
      const src = (attrs as Record<string, unknown>)["src"];
      const id = typeof src === "string" ? postImageId(src) : null;
      if (id !== null) {
        found.add(id);
      }
    }
  }
  walk(record["content"], found);
}

export function collectPostImageRefs(coverUrl: string, body: RichDoc): PostImageRef[] {
  const inBody = new Set<string>();
  walk(body, inBody);
  const refs: PostImageRef[] = [];
  const cover = postImageId(coverUrl);
  if (cover !== null) {
    refs.push({ fileId: cover, field: "coverUrl" });
    inBody.delete(cover);
  }
  for (const fileId of inBody) {
    refs.push({ fileId, field: "body" });
  }
  return refs;
}
