"use client";

import type { PostBlock } from "@esg/shared";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button, IconButton, Input, Textarea } from "@/components/ui";

interface BlockEditorProps {
  blocks: PostBlock[];
  onChange: (blocks: PostBlock[]) => void;
}

const TYPE_LABELS: Record<PostBlock["type"], string> = {
  paragraph: "Đoạn văn",
  heading: "Tiêu đề mục",
  callout: "Khung nổi bật",
};

function emptyBlock(type: PostBlock["type"]): PostBlock {
  if (type === "callout") {
    return { type, title: "", text: "" };
  }
  return { type, text: "" };
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  function update(index: number, block: PostBlock) {
    onChange(
      blocks.map((item, position) => (position === index ? block : item)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) {
      return;
    }
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    if (item) {
      next.splice(target, 0, item);
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong p-4 text-sm text-muted">
          Chưa có nội dung. Hãy thêm đoạn văn, tiêu đề mục hoặc khung nổi bật.
        </p>
      ) : null}

      {blocks.map((block, index) => (
        <div
          key={index}
          className="space-y-2 rounded-card border border-border bg-surface p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase text-subtle">
              {index + 1}. {TYPE_LABELS[block.type]}
            </span>
            <div className="flex">
              <IconButton
                label="Chuyển lên"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp aria-hidden className="size-4" />
              </IconButton>
              <IconButton
                label="Chuyển xuống"
                disabled={index === blocks.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden className="size-4" />
              </IconButton>
              <IconButton
                label="Xóa khối"
                tone="danger"
                onClick={() =>
                  onChange(blocks.filter((_, position) => position !== index))
                }
              >
                <Trash2 aria-hidden className="size-4" />
              </IconButton>
            </div>
          </div>

          {block.type === "paragraph" ? (
            <Textarea
              aria-label={`Đoạn văn ${index + 1}`}
              rows={15}
              value={block.text}
              onChange={(event) =>
                update(index, { type: "paragraph", text: event.target.value })
              }
              placeholder="Nội dung đoạn văn"
            />
          ) : null}

          {block.type === "heading" ? (
            <Input
              aria-label={`Tiêu đề mục ${index + 1}`}
              value={block.text}
              onChange={(event) =>
                update(index, { type: "heading", text: event.target.value })
              }
              placeholder="Tiêu đề mục"
            />
          ) : null}

          {block.type === "callout" ? (
            <div className="space-y-2">
              <Input
                aria-label={`Tiêu đề khung nổi bật ${index + 1}`}
                value={block.title}
                onChange={(event) =>
                  update(index, { ...block, title: event.target.value })
                }
                placeholder="Tiêu đề khung"
              />
              <Textarea
                aria-label={`Nội dung khung nổi bật ${index + 1}`}
                rows={10}
                value={block.text}
                onChange={(event) =>
                  update(index, { ...block, text: event.target.value })
                }
                placeholder="Nội dung khung"
              />
            </div>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as PostBlock["type"][]).map((type) => (
          <Button
            key={type}
            variant="secondary"
            size="sm"
            onClick={() => onChange([...blocks, emptyBlock(type)])}
          >
            + {TYPE_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}
