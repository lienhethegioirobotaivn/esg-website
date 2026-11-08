"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui";

import { logout } from "../lib/admin-api";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const busy = isSubmitting || isNavigating;

  async function handleLogout() {
    if (busy) {
      return;
    }
    setIsSubmitting(true);
    try {
      await logout();
    } catch {
      setIsSubmitting(false);
      return;
    }
    startNavigation(() => {
      router.push("/quan-tri");
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      leadingIcon={
        busy ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <LogOut aria-hidden className="size-4" />
        )
      }
      onClick={() => void handleLogout()}
    >
      {busy ? "Đang đăng xuất..." : "Đăng xuất"}
    </Button>
  );
}
