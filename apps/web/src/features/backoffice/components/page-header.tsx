import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  back,
  actions,
}: PageHeaderProps) {
  return (
    <header className="space-y-2">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl text-primary-800">{title}</h1>
          {description ? (
            <div className="mt-1 text-sm text-muted">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
