"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useLocale } from "../hooks/use-locale";
import { localizePath } from "../lib/path";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();
  return <Link href={localizePath(href, locale)} {...props} />;
}
