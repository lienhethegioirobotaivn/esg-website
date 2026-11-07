"use client";

import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Field, Input } from "@/components/ui";

import { AdminApiError, login } from "../lib/admin-api";

interface LoginFormProps {
  isConfigured: boolean;
}

export function LoginForm({ isConfigured }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(password);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Không đăng nhập được. Vui lòng thử lại.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto mt-12 max-w-sm p-6">
      <div className="flex items-center gap-2 text-primary-800">
        <Lock aria-hidden className="size-5" />
        <h1 className="text-lg">Đăng nhập quản trị</h1>
      </div>
      {isConfigured ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label="Mật khẩu" htmlFor="admin-password" error={error ?? undefined}>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              autoFocus
            />
          </Field>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || password === ""}
            leadingIcon={
              isSubmitting ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null
            }
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Chưa cấu hình mật khẩu quản trị. Hãy khai báo biến môi trường{" "}
          <code>ADMIN_PASSWORD</code> (ít nhất 8 ký tự) rồi khởi động lại máy
          chủ.
        </p>
      )}
    </Card>
  );
}
