"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { homePath } from "../lib/nav";
import { useAdmin } from "./admin-shell";
import { Loading } from "./states";

export function HomeRedirect() {
  const router = useRouter();
  const { role } = useAdmin();

  useEffect(() => {
    router.replace(homePath(role));
  }, [role, router]);

  return <Loading rows={3} />;
}
