"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Field, Input, Modal, Switch } from "@/components/ui";

import { errorMessage, sendJson } from "../../lib/api";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, toOptions } from "../../lib/labels";
import type { AdminRole, AdminUser } from "../../lib/types";
import { Choice } from "../choice";
import { useNotify } from "../toast";
import { PASSWORD_MIN_LENGTH, PasswordInput } from "./password-input";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountDialog({
  account,
  isSelf,
  onClose,
  onSaved,
}: {
  account: AdminUser | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const notify = useNotify();
  const [email, setEmail] = useState(account?.email ?? "");
  const [name, setName] = useState(account?.name ?? "");
  const [role, setRole] = useState<AdminRole>(account?.role ?? "ops");
  const [active, setActive] = useState(account?.active ?? true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const passwordTooShort =
    password !== "" && password.length < PASSWORD_MIN_LENGTH;
  const changes: Record<string, unknown> = {
    ...(account && name.trim() !== account.name ? { name: name.trim() } : {}),
    ...(account && role !== account.role ? { role } : {}),
    ...(account && active !== account.active ? { active } : {}),
    ...(password === "" ? {} : { password }),
  };
  const ready =
    name.trim() !== "" &&
    !passwordTooShort &&
    (account
      ? Object.keys(changes).length > 0
      : EMAIL_PATTERN.test(email.trim()) && password !== "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !ready) {
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      if (account) {
        await sendJson("PATCH", `/admin/users/${account.id}`, changes);
        notify("Đã cập nhật tài khoản.");
      } else {
        await sendJson("POST", "/admin/users", {
          email: email.trim(),
          name: name.trim(),
          role,
          password,
        });
        notify("Đã tạo tài khoản.");
      }
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught, "Không lưu được tài khoản."));
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={account ? "Sửa tài khoản" : "Thêm tài khoản"}
      onClose={onClose}
      dismissible={!isSaving}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Email đăng nhập" htmlFor="account-email" required>
          <Input
            id="account-email"
            type="email"
            autoComplete="off"
            maxLength={120}
            value={email}
            disabled={account !== null}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Họ tên" htmlFor="account-name" required>
          <Input
            id="account-name"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field
          label="Vai trò"
          htmlFor="account-role"
          required
          hint={
            isSelf
              ? "Bạn không thể tự đổi vai trò của mình."
              : ROLE_DESCRIPTIONS[role]
          }
        >
          <Choice
            id="account-role"
            value={role}
            disabled={isSelf}
            options={toOptions(ROLE_LABELS)}
            onChange={(event) => setRole(event.target.value as AdminRole)}
          />
        </Field>
        {account && !isSelf ? (
          <Switch
            id="account-active"
            label="Đang hoạt động"
            description="Tắt đi thì tài khoản bị đăng xuất và không đăng nhập được."
            checked={active}
            onChange={setActive}
          />
        ) : null}
        {isSelf ? (
          <p className="text-sm text-muted">
            Đổi mật khẩu của bạn ở mục Đổi mật khẩu.
          </p>
        ) : (
          <Field
            label={account ? "Đặt mật khẩu mới" : "Mật khẩu"}
            htmlFor="account-password"
            required={account === null}
            hint={`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự. ${
              account
                ? "Để trống nếu không đổi. Đặt mật khẩu mới sẽ mở khóa và đăng xuất tài khoản."
                : "Hãy gửi mật khẩu cho người dùng qua kênh riêng."
            }`}
            error={passwordTooShort ? "Mật khẩu còn quá ngắn." : undefined}
          >
            <PasswordInput
              id="account-password"
              value={password}
              generate
              invalid={passwordTooShort}
              onChange={setPassword}
            />
          </Field>
        )}
        {error ? (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={isSaving} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={isSaving} disabled={!ready}>
            {account ? "Lưu thay đổi" : "Tạo tài khoản"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
