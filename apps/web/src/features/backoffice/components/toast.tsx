"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

type ToastTone = "success" | "error";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

type Notify = (message: string, tone?: ToastTone) => void;

const TOAST_MS: Readonly<Record<ToastTone, number>> = {
  success: 4000,
  error: 8000,
};

const ToastContext = createContext<Notify>(() => undefined);

export function useNotify(): Notify {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sequence = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (message, tone = "success") => {
      sequence.current += 1;
      const id = sequence.current;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), TOAST_MS[tone]);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-card border bg-surface p-3 text-sm shadow-lg",
              toast.tone === "error"
                ? "border-danger-600"
                : "border-primary-600",
            )}
          >
            {toast.tone === "error" ? (
              <CircleAlert
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-danger-600"
              />
            ) : (
              <CircleCheck
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary-600"
              />
            )}
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              className="shrink-0 text-subtle hover:text-foreground"
              onClick={() => dismiss(toast.id)}
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
