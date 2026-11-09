"use client";

import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui";
import { useLocalePath } from "@/features/locale";

export function ComingSoonDialog() {
  const router = useRouter();
  const localePath = useLocalePath();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function leave() {
    router.push(localePath("/"));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        leave();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-surface p-8 text-center text-foreground shadow-xl backdrop:bg-white/30 backdrop:backdrop-blur-sm"
    >
      <Clock aria-hidden className="mx-auto size-12 text-primary-800" strokeWidth={1.5} />
      <h2
        id={titleId}
        className="mt-4 font-serif text-3xl font-bold text-primary-800"
      >
        Tính năng đang cập nhật
      </h2>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
        Chúng tôi đang hoàn thiện tính năng này.
        <br />
        Vui lòng quay lại sau. Cảm ơn bạn đã quan tâm!
      </p>
      <Button className="mt-6 min-w-36" onClick={leave}>
        Đã hiểu
      </Button>
    </dialog>
  );
}
