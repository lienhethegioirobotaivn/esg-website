"use client";

import { sanitizeRichDoc, type RichDoc } from "@esg/shared";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button, IconButton, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

import { AdminApiError, uploadImage } from "../lib/admin-api";
import { ImageBlock } from "../lib/image-block";
import { resizeImage } from "../lib/resize-image";

interface RichEditorProps {
  value: RichDoc;
  onChange: (doc: RichDoc) => void;
}

const IMAGE_SIZES = [25, 50, 75, 100] as const;

function ToolButton({
  label,
  active = false,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(active && "bg-primary-100 text-primary-800")}
    >
      {children}
    </IconButton>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

function readImageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

interface ToolbarProps {
  editor: Editor;
  pending: number;
  error: string | null;
  onPickImage: () => void;
}

function Toolbar({ editor, pending, error, onPickImage }: ToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const image = current.isActive("image")
        ? (current.getAttributes("image") as {
            align: string;
            width: number;
            alt: string | null;
          })
        : null;
      const align =
        (["center", "right", "justify"] as const).find((item) =>
          current.isActive({ textAlign: item }),
        ) ?? "left";
      return {
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        link: current.isActive("link"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        blockquote: current.isActive("blockquote"),
        block: current.isActive("heading", { level: 2 })
          ? "2"
          : current.isActive("heading", { level: 3 })
            ? "3"
            : "p",
        align,
        image,
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
      };
    },
  });

  const chain = (current: Editor) => current.chain().focus();
  const imageAlign = state.image?.align;

  function setAlign(align: "left" | "center" | "right" | "justify") {
    if (state.image) {
      if (align !== "justify") {
        editor.chain().focus().updateAttributes("image", { align }).run();
      }
      return;
    }
    chain(editor).setTextAlign(align).run();
  }

  function isAlignActive(align: "left" | "center" | "right") {
    return state.image ? imageAlign === align : state.align === align;
  }

  function openLink() {
    setLinkValue(
      (editor.getAttributes("link") as { href?: string }).href ?? "",
    );
    setLinkOpen(true);
  }

  function applyLink() {
    const href = linkValue.trim();
    if (href === "") {
      chain(editor).extendMarkRange("link").unsetLink().run();
    } else {
      const safe = /^(https?:\/\/|mailto:)/.test(href)
        ? href
        : `https://${href}`;
      chain(editor).extendMarkRange("link").setLink({ href: safe }).run();
    }
    setLinkOpen(false);
  }

  function changeBlock(next: string) {
    if (next === "p") {
      chain(editor).setParagraph().run();
    } else {
      chain(editor)
        .setHeading({ level: next === "2" ? 2 : 3 })
        .run();
    }
  }

  return (
    <div className="sticky top-0 z-10 rounded-t-card border-b border-border bg-surface-muted p-1.5">
      <div className="flex flex-wrap items-center gap-0.5">
        <ToolButton
          label="Hoàn tác"
          disabled={!state.canUndo}
          onClick={() => chain(editor).undo().run()}
        >
          <Undo2 aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Làm lại"
          disabled={!state.canRedo}
          onClick={() => chain(editor).redo().run()}
        >
          <Redo2 aria-hidden className="size-4" />
        </ToolButton>
        <Divider />
        <select
          aria-label="Kiểu đoạn"
          value={state.block}
          onChange={(event) => changeBlock(event.target.value)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="p">Đoạn văn</option>
          <option value="2">Tiêu đề lớn</option>
          <option value="3">Tiêu đề nhỏ</option>
        </select>
        <Divider />
        <ToolButton
          label="In đậm"
          active={state.bold}
          onClick={() => chain(editor).toggleBold().run()}
        >
          <Bold aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="In nghiêng"
          active={state.italic}
          onClick={() => chain(editor).toggleItalic().run()}
        >
          <Italic aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Gạch chân"
          active={state.underline}
          onClick={() => chain(editor).toggleUnderline().run()}
        >
          <Underline aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Chèn liên kết"
          active={state.link}
          onClick={openLink}
        >
          <Link2 aria-hidden className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Căn trái"
          active={isAlignActive("left")}
          onClick={() => setAlign("left")}
        >
          <AlignLeft aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Căn giữa"
          active={isAlignActive("center")}
          onClick={() => setAlign("center")}
        >
          <AlignCenter aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Căn phải"
          active={isAlignActive("right")}
          onClick={() => setAlign("right")}
        >
          <AlignRight aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Căn đều hai bên"
          active={!state.image && state.align === "justify"}
          disabled={Boolean(state.image)}
          onClick={() => setAlign("justify")}
        >
          <AlignJustify aria-hidden className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Danh sách dấu đầu dòng"
          active={state.bulletList}
          onClick={() => chain(editor).toggleBulletList().run()}
        >
          <List aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Danh sách đánh số"
          active={state.orderedList}
          onClick={() => chain(editor).toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Khung trích dẫn"
          active={state.blockquote}
          onClick={() => chain(editor).toggleBlockquote().run()}
        >
          <Quote aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Đường kẻ ngang"
          onClick={() => chain(editor).setHorizontalRule().run()}
        >
          <Minus aria-hidden className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="Chèn ảnh" onClick={onPickImage}>
          <ImagePlus aria-hidden className="size-4" />
        </ToolButton>
        {pending > 0 ? (
          <span
            role="status"
            className="ml-2 inline-flex items-center gap-1.5 text-xs text-muted"
          >
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            Đang tải ảnh…
          </span>
        ) : null}
      </div>

      {linkOpen ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Input
            aria-label="Địa chỉ liên kết"
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://..."
            className="max-w-sm"
          />
          <Button size="sm" onClick={applyLink}>
            Áp dụng
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLinkOpen(false)}
          >
            Hủy
          </Button>
        </div>
      ) : null}

      {state.image ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-border pt-1.5">
          <span className="text-xs font-semibold text-muted">
            Ảnh đang chọn:
          </span>
          <div className="flex gap-1">
            {IMAGE_SIZES.map((size) => (
              <Button
                key={size}
                size="sm"
                variant={state.image?.width === size ? "primary" : "secondary"}
                onClick={() =>
                  chain(editor).updateAttributes("image", { width: size }).run()
                }
              >
                {size}%
              </Button>
            ))}
          </div>
          <Input
            aria-label="Mô tả ảnh"
            value={state.image.alt ?? ""}
            onChange={(event) =>
              editor
                .chain()
                .updateAttributes("image", { alt: event.target.value })
                .run()
            }
            placeholder="Mô tả ảnh (cho người khiếm thị)"
            className="max-w-xs"
          />
          <IconButton
            label="Xóa ảnh"
            tone="danger"
            onClick={() => chain(editor).deleteSelection().run()}
          >
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RichEditor({ value, onChange }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertRef = useRef<(files: File[], position?: number) => void>(
    () => {},
  );
  const onChangeRef = useRef(onChange);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        link: { openOnClick: false, autolink: true },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ImageBlock,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-content min-h-80 px-4 py-3 focus:outline-none",
        "aria-label": "Nội dung bài viết",
      },
      handlePaste: (_view, event) => {
        const files = readImageFiles(event.clipboardData?.files);
        if (files.length === 0) {
          return false;
        }
        event.preventDefault();
        insertRef.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = readImageFiles(event.dataTransfer?.files);
        if (moved || files.length === 0) {
          return false;
        }
        event.preventDefault();
        const position = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        insertRef.current(files, position);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(sanitizeRichDoc(current.getJSON()));
    },
  });

  useEffect(() => {
    insertRef.current = (files, position) => {
      if (!editor) {
        return;
      }
      setError(null);
      let target = position;
      files.forEach((file) => {
        setPending((count) => count + 1);
        resizeImage(file)
          .then((blob) => uploadImage(blob))
          .then((src) => {
            const node = {
              type: "image",
              attrs: { src, alt: "", align: "center", width: 100 },
            };
            const chain = editor.chain().focus();
            if (target === undefined) {
              chain.insertContent(node).run();
            } else {
              chain.insertContentAt(target, node).run();
              target = undefined;
            }
          })
          .catch((caught: unknown) => {
            setError(
              caught instanceof AdminApiError
                ? caught.message
                : "Không tải được ảnh. Vui lòng dùng ảnh JPG, PNG hoặc WEBP khác.",
            );
          })
          .finally(() => setPending((count) => count - 1));
      });
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-80 rounded-card border border-border bg-surface-muted" />
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface">
      <Toolbar
        editor={editor}
        pending={pending}
        error={error}
        onPickImage={() => fileInputRef.current?.click()}
      />

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        data-testid="rich-image-input"
        onChange={(event) => {
          insertRef.current(readImageFiles(event.target.files));
          event.target.value = "";
        }}
      />
    </div>
  );
}
