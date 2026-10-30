"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

import { useLeaveGuardStore } from "../store/leave-guard-store";

type GuardedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function GuardedLink({ href, onClick, ...props }: GuardedLinkProps) {
  const pathname = usePathname();
  const isGuarded = useLeaveGuardStore((state) => state.guard !== null);
  const requestLeave = useLeaveGuardStore((state) => state.requestLeave);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || !isGuarded || !isPlainLeftClick(event)) {
      return;
    }
    if (href === pathname) {
      return;
    }
    event.preventDefault();
    requestLeave(href);
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
