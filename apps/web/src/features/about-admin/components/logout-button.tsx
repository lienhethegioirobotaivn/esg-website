"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";

import { logout } from "../lib/admin-api";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      leadingIcon={<LogOut aria-hidden className="size-4" />}
      onClick={async () => {
        await logout();
        router.push("/quan-tri");
        router.refresh();
      }}
    >
      Đăng xuất
    </Button>
  );
}
