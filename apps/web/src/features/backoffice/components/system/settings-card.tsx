"use client";

import { FEEDBACK_INVITE_DELAY_LIMITS, type AdminSettingsView } from "@esg/shared";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Field, Input } from "@/components/ui";

import { errorMessage, sendJson } from "../../lib/api";
import { useResource } from "../../lib/use-resource";
import { useUnsavedWarning } from "../../lib/use-unsaved-warning";
import { LoadError, Loading } from "../states";
import { useNotify } from "../toast";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toForm(settings: AdminSettingsView) {
  return {
    days: String(settings.feedbackInviteDelayDays),
    email: settings.inquiryNotifyEmail ?? "",
  };
}

function SettingsForm({
  settings,
  onSaved,
}: {
  settings: AdminSettingsView;
  onSaved: (next: AdminSettingsView) => void;
}) {
  const notify = useNotify();
  const [saved, setSaved] = useState(() => toForm(settings));
  const [form, setForm] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { min, max } = FEEDBACK_INVITE_DELAY_LIMITS;
  const days = Number(form.days);
  const daysError =
    form.days !== "" && (!Number.isInteger(days) || days < min || days > max)
      ? `Nhập số nguyên từ ${min} đến ${max}.`
      : undefined;
  const email = form.email.trim();
  const emailError =
    email !== "" && !EMAIL_PATTERN.test(email)
      ? "Email chưa đúng định dạng."
      : undefined;
  const dirty = form.days !== saved.days || form.email !== saved.email;
  useUnsavedWarning(dirty);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !dirty || daysError || emailError) {
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const next = await sendJson<AdminSettingsView>(
        "PATCH",
        "/admin/settings",
        {
          ...(form.days === saved.days
            ? {}
            : { feedbackInviteDelayDays: form.days === "" ? null : days }),
          ...(form.email === saved.email
            ? {}
            : { inquiryNotifyEmail: email === "" ? null : email }),
        },
      );
      setSaved(toForm(next));
      setForm(toForm(next));
      onSaved(next);
      notify("Đã lưu cài đặt.");
    } catch (caught) {
      setError(errorMessage(caught, "Không lưu được cài đặt."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        label="Số ngày sau khi xuất báo cáo thì mời đánh giá"
        htmlFor="setting-days"
        hint={`Từ ${min} đến ${max}. Để trống để dùng mặc định (${settings.defaults.feedbackInviteDelayDays} ngày).`}
        error={daysError}
      >
        <Input
          id="setting-days"
          type="number"
          min={min}
          max={max}
          className="max-w-40"
          value={form.days}
          aria-invalid={Boolean(daysError)}
          onChange={(event) => setForm({ ...form, days: event.target.value })}
        />
      </Field>
      <Field
        label="Email nhận thông báo yêu cầu mới"
        htmlFor="setting-email"
        hint={
          settings.defaults.inquiryNotifyEmail
            ? `Để trống để dùng mặc định: ${settings.defaults.inquiryNotifyEmail}.`
            : "Để trống thì không gửi thông báo."
        }
        error={emailError}
      >
        <Input
          id="setting-email"
          type="email"
          maxLength={120}
          value={form.email}
          aria-invalid={Boolean(emailError)}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        loading={isSaving}
        disabled={!dirty || Boolean(daysError) || Boolean(emailError)}
      >
        Lưu cài đặt
      </Button>
    </form>
  );
}

export function SettingsCard() {
  const resource = useResource<AdminSettingsView>("/admin/settings");
  return (
    <section className="space-y-2">
      <h2 className="text-base">Cài đặt</h2>
      {resource.error ? (
        <LoadError error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data ? (
        <Card className="max-w-2xl p-5">
          <SettingsForm settings={resource.data} onSaved={resource.replace} />
        </Card>
      ) : resource.loading ? (
        <Loading rows={3} />
      ) : null}
    </section>
  );
}
