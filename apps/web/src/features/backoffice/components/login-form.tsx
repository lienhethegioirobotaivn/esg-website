"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Field, Input } from "@/components/ui";

import { errorMessage, sendJson } from "../lib/api";
import type { AdminProfile } from "../lib/types";

export function LoginForm({
  defaultEmail = "",
  onSignedIn,
}: {
  defaultEmail?: string;
  onSignedIn: (admin: AdminProfile) => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
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
      const admin = await sendJson<AdminProfile>("POST", "/admin/login", {
        email: email.trim(),
        password,
      });
      onSignedIn(admin);
    } catch (caught) {
      setError(errorMessage(caught, "Không đăng nhập được. Vui lòng thử lại."));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" htmlFor="admin-email">
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoFocus={defaultEmail === ""}
        />
      </Field>
      <Field label="Mật khẩu" htmlFor="admin-password">
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(error)}
          autoFocus={defaultEmail !== ""}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        loading={isSubmitting}
        disabled={email.trim() === "" || password === ""}
      >
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </form>
  );
}
