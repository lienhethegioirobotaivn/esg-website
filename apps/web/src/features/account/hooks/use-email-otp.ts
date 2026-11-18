import { emailAddressSchema, EMAIL_OTP_RULES } from "@esg/shared";
import { useEffect, useState } from "react";

import { useLocale, useT } from "@/features/locale";

import {
  AccountError,
  fetchSessionEmail,
  logoutEmail,
  requestEmailCode,
  verifyEmailCode,
} from "../services/account.service";

export type EmailOtpPhase = "checking" | "idle" | "code" | "linked";
export type EmailOtpBusy = "send" | "verify" | "attach" | "logout" | null;

interface UseEmailOtpInput {
  onVerified?: (email: string) => Promise<void>;
}

export interface EmailOtp {
  phase: EmailOtpPhase;
  email: string;
  setEmail: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  busy: EmailOtpBusy;
  error: string | null;
  cooldown: number;
  linkedEmail: string | null;
  needsAttachRetry: boolean;
  sendCode: () => Promise<void>;
  verifyCode: () => Promise<void>;
  retryAttach: () => Promise<void>;
  changeEmail: () => void;
  signOut: () => Promise<void>;
}

export function useEmailOtp({ onVerified }: UseEmailOtpInput = {}): EmailOtp {
  const t = useT();
  const locale = useLocale();
  const [phase, setPhase] = useState<EmailOtpPhase>("checking");
  const [email, setEmailState] = useState("");
  const [code, setCodeState] = useState("");
  const [busy, setBusy] = useState<EmailOtpBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [needsAttachRetry, setNeedsAttachRetry] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchSessionEmail().then((sessionEmail) => {
      if (!active) {
        return;
      }
      if (sessionEmail !== null) {
        setLinkedEmail(sessionEmail);
        setPhase("linked");
      } else {
        setPhase("idle");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function setEmail(value: string) {
    setEmailState(value);
    setError(null);
  }

  function setCode(value: string) {
    setCodeState(value.replace(/\D/g, "").slice(0, EMAIL_OTP_RULES.codeLength));
    setError(null);
  }

  function describe(failure: unknown): string {
    if (failure instanceof AccountError) {
      const base = t(failure.message);
      return failure.triesLeft !== null && failure.triesLeft > 0
        ? `${base} ${t("Còn {count} lần thử.", { count: failure.triesLeft })}`
        : base;
    }
    return t("Không kết nối được. Vui lòng thử lại.");
  }

  async function sendCode() {
    if (busy !== null || cooldown > 0) {
      return;
    }
    const parsed = emailAddressSchema.safeParse(email);
    if (!parsed.success) {
      setError(t("Vui lòng nhập email hợp lệ."));
      return;
    }
    setBusy("send");
    setError(null);
    try {
      const result = await requestEmailCode({ email: parsed.data, locale });
      setEmailState(parsed.data);
      setCodeState("");
      setCooldown(result.resendAfter);
      setPhase("code");
    } catch (failure) {
      if (failure instanceof AccountError && failure.retryAfter !== null) {
        setCooldown(Math.min(failure.retryAfter, 3600));
      }
      setError(describe(failure));
    } finally {
      setBusy(null);
    }
  }

  async function attach(verifiedEmail: string) {
    if (!onVerified) {
      return;
    }
    setBusy("attach");
    try {
      await onVerified(verifiedEmail);
      setNeedsAttachRetry(false);
      setError(null);
    } catch {
      setNeedsAttachRetry(true);
      setError(
        t("Đã xác nhận email nhưng chưa liên kết được báo cáo. Vui lòng thử lại."),
      );
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode() {
    if (busy !== null) {
      return;
    }
    if (code.length !== EMAIL_OTP_RULES.codeLength) {
      setError(t("Mã xác nhận gồm 6 chữ số."));
      return;
    }
    setBusy("verify");
    setError(null);
    let verified: string;
    try {
      verified = await verifyEmailCode({ email, code });
    } catch (failure) {
      setError(describe(failure));
      setBusy(null);
      return;
    }
    setLinkedEmail(verified);
    setPhase("linked");
    setCodeState("");
    setCooldown(0);
    setBusy(null);
    await attach(verified);
  }

  async function retryAttach() {
    if (busy !== null || linkedEmail === null) {
      return;
    }
    await attach(linkedEmail);
  }

  function changeEmail() {
    setCodeState("");
    setError(null);
    setPhase("idle");
  }

  async function signOut() {
    if (busy !== null) {
      return;
    }
    setBusy("logout");
    try {
      await logoutEmail();
      setLinkedEmail(null);
      setNeedsAttachRetry(false);
      setEmailState("");
      setError(null);
      setPhase("idle");
    } catch (failure) {
      setError(describe(failure));
    } finally {
      setBusy(null);
    }
  }

  return {
    phase,
    email,
    setEmail,
    code,
    setCode,
    busy,
    error,
    cooldown,
    linkedEmail,
    needsAttachRetry,
    sendCode,
    verifyCode,
    retryAttach,
    changeEmail,
    signOut,
  };
}
