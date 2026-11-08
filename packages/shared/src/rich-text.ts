import type { PostBlock } from "./about";

export type RichAlign = "left" | "center" | "right" | "justify";
export type ImageAlign = "left" | "center" | "right";

export type RichMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "link"; attrs: { href: string } };

export type RichInline =
  { type: "text"; text: string; marks?: RichMark[] } | { type: "hardBreak" };

export interface RichParagraph {
  type: "paragraph";
  attrs?: { textAlign?: RichAlign };
  content?: RichInline[];
}

export interface RichHeading {
  type: "heading";
  attrs: { level: 2 | 3; textAlign?: RichAlign };
  content?: RichInline[];
}

export interface RichImage {
  type: "image";
  attrs: { src: string; alt: string; align: ImageAlign; width: number };
}

export interface RichBlockquote {
  type: "blockquote";
  content: RichBlock[];
}

export interface RichListItem {
  type: "listItem";
  content: RichBlock[];
}

export interface RichList {
  type: "bulletList" | "orderedList";
  content: RichListItem[];
}

export interface RichRule {
  type: "horizontalRule";
}

export type RichBlock =
  | RichParagraph
  | RichHeading
  | RichImage
  | RichBlockquote
  | RichList
  | RichRule;

export interface RichDoc {
  type: "doc";
  content: RichBlock[];
}

export const RICH_DOC_MAX_BLOCKS = 300;
export const RICH_DOC_MAX_BYTES = 45000;

const MAX_DEPTH = 4;
const MAX_TEXT = 5000;
const MAX_ALT = 200;
const MAX_HREF = 500;
const ALIGNS: readonly RichAlign[] = ["left", "center", "right", "justify"];
const IMAGE_ALIGNS: readonly ImageAlign[] = ["left", "center", "right"];
const IMAGE_URL = /^https:\/\/[^\s"'()<>\\]+$/;
const LINK_URL = /^(https?:\/\/|mailto:)[^\s"'<>\\]+$/;

export const EMPTY_RICH_DOC: RichDoc = { type: "doc", content: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickAlign(attrs: unknown): RichAlign | undefined {
  if (!isRecord(attrs)) {
    return undefined;
  }
  const value = attrs["textAlign"];
  return ALIGNS.find((item) => item === value);
}

function cleanMarks(raw: unknown): RichMark[] {
  const marks: RichMark[] = [];
  for (const item of asArray(raw)) {
    if (!isRecord(item)) {
      continue;
    }
    const type = item["type"];
    if (type === "bold" || type === "italic" || type === "underline") {
      if (!marks.some((mark) => mark.type === type)) {
        marks.push({ type });
      }
    } else if (type === "link" && isRecord(item["attrs"])) {
      const href = item["attrs"]["href"];
      if (
        typeof href === "string" &&
        href.length <= MAX_HREF &&
        LINK_URL.test(href) &&
        !marks.some((mark) => mark.type === "link")
      ) {
        marks.push({ type: "link", attrs: { href } });
      }
    }
  }
  return marks;
}

function cleanInline(raw: unknown): RichInline[] {
  const result: RichInline[] = [];
  for (const item of asArray(raw)) {
    if (!isRecord(item)) {
      continue;
    }
    if (item["type"] === "hardBreak") {
      result.push({ type: "hardBreak" });
    } else if (item["type"] === "text" && typeof item["text"] === "string") {
      const text = item["text"].slice(0, MAX_TEXT);
      if (text === "") {
        continue;
      }
      const marks = cleanMarks(item["marks"]);
      result.push(
        marks.length > 0
          ? { type: "text", text, marks }
          : { type: "text", text },
      );
    }
  }
  return result;
}

function cleanImage(item: Record<string, unknown>): RichImage | null {
  const attrs = isRecord(item["attrs"]) ? item["attrs"] : {};
  const src = attrs["src"];
  if (typeof src !== "string" || src.length > 500 || !IMAGE_URL.test(src)) {
    return null;
  }
  const alt =
    typeof attrs["alt"] === "string" ? attrs["alt"].slice(0, MAX_ALT) : "";
  const align =
    IMAGE_ALIGNS.find((value) => value === attrs["align"]) ?? "center";
  const rawWidth = Number(attrs["width"]);
  const width =
    Number.isFinite(rawWidth) && rawWidth >= 10 && rawWidth <= 100
      ? Math.round(rawWidth)
      : 100;
  return { type: "image", attrs: { src, alt, align, width } };
}

function cleanBlocks(raw: unknown, depth: number): RichBlock[] {
  const result: RichBlock[] = [];
  for (const item of asArray(raw)) {
    if (!isRecord(item)) {
      continue;
    }
    const type = item["type"];
    if (type === "paragraph") {
      const textAlign = pickAlign(item["attrs"]);
      const content = cleanInline(item["content"]);
      result.push({
        type: "paragraph",
        ...(textAlign && textAlign !== "left" ? { attrs: { textAlign } } : {}),
        ...(content.length > 0 ? { content } : {}),
      });
    } else if (type === "heading") {
      const level =
        isRecord(item["attrs"]) && item["attrs"]["level"] === 3 ? 3 : 2;
      const textAlign = pickAlign(item["attrs"]);
      const content = cleanInline(item["content"]);
      result.push({
        type: "heading",
        attrs: {
          level,
          ...(textAlign && textAlign !== "left" ? { textAlign } : {}),
        },
        ...(content.length > 0 ? { content } : {}),
      });
    } else if (type === "image") {
      const image = cleanImage(item);
      if (image) {
        result.push(image);
      }
    } else if (type === "horizontalRule") {
      result.push({ type: "horizontalRule" });
    } else if (depth < MAX_DEPTH && type === "blockquote") {
      const content = cleanBlocks(item["content"], depth + 1);
      if (content.length > 0) {
        result.push({ type: "blockquote", content });
      }
    } else if (
      depth < MAX_DEPTH &&
      (type === "bulletList" || type === "orderedList")
    ) {
      const items: RichListItem[] = [];
      for (const entry of asArray(item["content"])) {
        if (isRecord(entry) && entry["type"] === "listItem") {
          const content = cleanBlocks(entry["content"], depth + 1);
          if (content.length > 0) {
            items.push({ type: "listItem", content });
          }
        }
      }
      if (items.length > 0) {
        result.push({ type, content: items });
      }
    }
  }
  return result;
}

function legacyBlocks(blocks: PostBlock[]): RichBlock[] {
  const result: RichBlock[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph") {
      result.push({
        type: "paragraph",
        content: [{ type: "text", text: block.text }],
      });
    } else if (block.type === "heading") {
      result.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: block.text }],
      });
    } else {
      result.push({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: block.title, marks: [{ type: "bold" }] },
            ],
          },
          { type: "paragraph", content: [{ type: "text", text: block.text }] },
        ],
      });
    }
  }
  return result;
}

export function richDocFromBlocks(blocks: PostBlock[]): RichDoc {
  return sanitizeRichDoc({ type: "doc", content: legacyBlocks(blocks) });
}

export function sanitizeRichDoc(raw: unknown): RichDoc {
  if (Array.isArray(raw)) {
    const blocks: PostBlock[] = [];
    for (const item of raw) {
      if (
        isRecord(item) &&
        (item["type"] === "paragraph" || item["type"] === "heading") &&
        typeof item["text"] === "string"
      ) {
        blocks.push({ type: item["type"], text: item["text"] });
      } else if (
        isRecord(item) &&
        item["type"] === "callout" &&
        typeof item["title"] === "string" &&
        typeof item["text"] === "string"
      ) {
        blocks.push({
          type: "callout",
          title: item["title"],
          text: item["text"],
        });
      }
    }
    return richDocFromBlocks(blocks);
  }
  if (!isRecord(raw) || raw["type"] !== "doc") {
    return { type: "doc", content: [] };
  }
  return { type: "doc", content: cleanBlocks(raw["content"], 0) };
}

function inlineHasContent(content: RichInline[] | undefined): boolean {
  return (content ?? []).some(
    (item) => item.type === "text" && item.text.trim() !== "",
  );
}

function blockHasContent(block: RichBlock): boolean {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return inlineHasContent(block.content);
    case "image":
    case "horizontalRule":
      return true;
    case "blockquote":
      return block.content.some(blockHasContent);
    case "bulletList":
    case "orderedList":
      return block.content.some((item) => item.content.some(blockHasContent));
  }
}

export function isRichDocEmpty(doc: RichDoc): boolean {
  return !doc.content.some(blockHasContent);
}

export function richDocSize(doc: RichDoc): number {
  return JSON.stringify(doc).length;
}
