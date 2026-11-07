"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import type { ComponentType } from "react";

import {
  FacebookIcon,
  LinkedInIcon,
  XIcon,
  ZaloIcon,
} from "./brand-icons";

interface Target {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  buildUrl: (url: string, title: string) => string;
}

const TARGETS: readonly Target[] = [
  {
    id: "facebook",
    label: "Chia sẻ lên Facebook",
    Icon: FacebookIcon,
    buildUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "zalo",
    label: "Chia sẻ qua Zalo",
    Icon: ZaloIcon,
    buildUrl: (url) =>
      `https://sp.zalo.me/plugins/share?dev=1&url=${encodeURIComponent(url)}`,
  },
  {
    id: "linkedin",
    label: "Chia sẻ lên LinkedIn",
    Icon: LinkedInIcon,
    buildUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "x",
    label: "Chia sẻ lên X",
    Icon: XIcon,
    buildUrl: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
];

interface ShareBarProps {
  title: string;
}

export function ShareBar({ title }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  function share(target: Target) {
    window.open(
      target.buildUrl(window.location.href, title),
      "_blank",
      "noopener,noreferrer,width=640,height=560",
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold">Chia sẻ</span>
      <ul className="flex items-center gap-2">
        {TARGETS.map((target) => (
          <li key={target.id}>
            <button
              type="button"
              onClick={() => share(target)}
              aria-label={target.label}
              title={target.label}
              className="block rounded-control transition-opacity hover:opacity-80"
            >
              <target.Icon className="size-8" />
            </button>
          </li>
        ))}
      </ul>
      <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />
      <button
        type="button"
        onClick={() => void copyLink()}
        className="inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-muted"
      >
        {copied ? (
          <Check aria-hidden className="size-4 text-primary-600" />
        ) : (
          <Link2 aria-hidden className="size-4" />
        )}
        {copied ? "Đã sao chép" : "Sao chép liên kết"}
      </button>
    </div>
  );
}
