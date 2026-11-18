"use client";

import { maskEmail } from "@esg/shared";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import type { FormEvent } from "react";

import { Button, Input } from "@/components/ui";
import { useT } from "@/features/locale";

import { useEmailOtp } from "../hooks/use-email-otp";

interface EmailOtpFormProps {
  onVerified?: (email: string) => Promise<void>;
  idPrefix?: string;
}

function cooldownLabel(
  t: ReturnType<typeof useT>,
  seconds: number,
): string {
  return seconds >= 120
    ? t("Thử lại sau {minutes} phút", { minutes: Math.ceil(seconds / 60) })
    : t("Gửi lại sau {seconds} giây", { seconds });
}

export function EmailOtpForm({
  onVerified,
  idPrefix = "email-otp",
}: EmailOtpFormProps) {
  const t = useT();
  const otp = useEmailOtp({ onVerified });
  const emailId = `${idPrefix}-email`;
  const codeId = `${idPrefix}-code`;
  const errorId = `${idPrefix}-error`;

  if (otp.phase === "checking") {
    return null;
  }

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    void otp.sendCode();
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    void otp.verifyCode();
  }

  const errorNode = otp.error ? (
    <p id={errorId} role="alert" className="mt-2 text-xs text-danger-600">
      {otp.error}
    </p>
  ) : null;

  if (otp.phase === "linked" && otp.linkedEmail !== null) {
    return (
      <section
        aria-label={t("Xem lại báo cáo sau")}
        className="rounded-card border border-border px-4 py-3"
      >
        <div className="flex items-start gap-2 text-sm">
          {otp.busy === "attach" ? (
            <LoaderCircle aria-hidden className="mt-0.5 size-4 shrink-0 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-primary-700" />
          )}
          {otp.needsAttachRetry ? (
            <p>
              {t("Đã xác nhận email {email}.", {
                email: maskEmail(otp.linkedEmail),
              })}
            </p>
          ) : (
            <p>
              {t("Báo cáo này đã liên kết với {email}.", {
                email: maskEmail(otp.linkedEmail),
              })}{" "}
              <span className="text-muted">
                {t("Bạn dùng email này để xem lại báo cáo sau.")}
              </span>
            </p>
          )}
        </div>
        {errorNode}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {otp.needsAttachRetry ? (
            <button
              type="button"
              onClick={() => void otp.retryAttach()}
              disabled={otp.busy !== null}
              className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900"
            >
              {t("Thử lại")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void otp.signOut()}
            disabled={otp.busy !== null}
            className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900"
          >
            {t("Dùng email khác")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={t("Xem lại báo cáo sau")}
      className="rounded-card border border-border px-4 py-3"
    >
      <p className="text-sm font-medium">
        {t("Xem lại báo cáo sau (không bắt buộc)")}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {t(
          "Nhập email để nhận mã xác nhận. Lần sau bạn chỉ cần email này để xem lại các báo cáo đã tạo.",
        )}
      </p>

      {otp.phase === "idle" ? (
        <form onSubmit={submitEmail} className="mt-3 flex gap-2" noValidate>
          <label htmlFor={emailId} className="sr-only">
            {t("Email")}
          </label>
          <Input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="email@congty.vn"
            value={otp.email}
            maxLength={254}
            aria-invalid={otp.error !== null}
            aria-describedby={otp.error ? errorId : undefined}
            onChange={(event) => otp.setEmail(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            className="shrink-0"
            disabled={otp.busy !== null || otp.cooldown > 0}
          >
            {otp.busy === "send"
              ? t("Đang gửi...")
              : otp.cooldown > 0
                ? cooldownLabel(t, otp.cooldown)
                : t("Gửi mã")}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-3" noValidate>
          <p className="text-xs text-muted">
            {t(
              "Đã gửi mã tới {email}. Mã có hiệu lực 10 phút. Hãy kiểm tra cả thư mục thư rác.",
              { email: otp.email },
            )}
          </p>
          <div className="mt-2 flex gap-2">
            <label htmlFor={codeId} className="sr-only">
              {t("Mã xác nhận (6 số)")}
            </label>
            <Input
              id={codeId}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={otp.code}
              maxLength={6}
              aria-invalid={otp.error !== null}
              aria-describedby={otp.error ? errorId : undefined}
              onChange={(event) => otp.setCode(event.target.value)}
            />
            <Button
              type="submit"
              className="shrink-0"
              disabled={otp.busy !== null || otp.code.length !== 6}
            >
              {otp.busy === "verify" ? t("Đang xác nhận...") : t("Xác nhận")}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <button
              type="button"
              onClick={() => void otp.sendCode()}
              disabled={otp.busy !== null || otp.cooldown > 0}
              className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900 disabled:cursor-not-allowed disabled:text-subtle disabled:no-underline"
            >
              {otp.cooldown > 0
                ? cooldownLabel(t, otp.cooldown)
                : t("Gửi lại mã")}
            </button>
            <button
              type="button"
              onClick={otp.changeEmail}
              disabled={otp.busy !== null}
              className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900"
            >
              {t("Dùng email khác")}
            </button>
          </div>
        </form>
      )}

      {errorNode}
      <p className="mt-2 text-xs text-subtle">
        {t("Email chỉ dùng để xác nhận và để bạn xem lại báo cáo.")}
      </p>
    </section>
  );
}
