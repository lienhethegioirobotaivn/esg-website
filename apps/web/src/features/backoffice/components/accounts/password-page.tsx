"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Field } from "@/components/ui";

import { errorMessage, sendJson } from "../../lib/api";
import { PageHeader } from "../page-header";
import { useNotify } from "../toast";
import { PASSWORD_MIN_LENGTH, PasswordInput } from "./password-input";

export function PasswordPage() {
  const notify = useNotify();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tooShort = next !== "" && next.length < PASSWORD_MIN_LENGTH;
  const unchanged = next !== "" && next === current;
  const mismatch = repeat !== "" && repeat !== next;
  const ready =
    current !== "" && next !== "" && repeat === next && !tooShort && !unchanged;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !ready) {
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await sendJson("POST", "/admin/me/password", {
        currentPassword: current,
        newPassword: next,
      });
      setCurrent("");
      setNext("");
      setRepeat("");
      notify("Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.");
    } catch (caught) {
      setError(errorMessage(caught, "Không đổi được mật khẩu."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Đổi mật khẩu" />
      <Card className="max-w-xl p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Mật khẩu hiện tại" htmlFor="password-current" required>
            <PasswordInput
              id="password-current"
              autoComplete="current-password"
              value={current}
              onChange={setCurrent}
            />
          </Field>
          <Field
            label="Mật khẩu mới"
            htmlFor="password-next"
            required
            hint={`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự, khác mật khẩu hiện tại.`}
            error={
              tooShort
                ? "Mật khẩu còn quá ngắn."
                : unchanged
                  ? "Mật khẩu mới phải khác mật khẩu hiện tại."
                  : undefined
            }
          >
            <PasswordInput
              id="password-next"
              value={next}
              invalid={tooShort || unchanged}
              onChange={setNext}
            />
          </Field>
          <Field
            label="Nhập lại mật khẩu mới"
            htmlFor="password-repeat"
            required
            error={mismatch ? "Hai lần nhập chưa giống nhau." : undefined}
          >
            <PasswordInput
              id="password-repeat"
              value={repeat}
              invalid={mismatch}
              onChange={setRepeat}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-danger-600">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={isSaving} disabled={!ready}>
            Đổi mật khẩu
          </Button>
        </form>
      </Card>
    </div>
  );
}
