"use client";

import { useState } from "react";

import { Button, Modal } from "@/components/ui";
import { useT } from "@/features/locale";

import { HOW_IT_WORKS_STEPS } from "../constants";

export function HowItWorksLink() {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-[#006644] transition-colors"
      >
        <span>{t("Hướng dẫn")}</span>
      </button>

      {isOpen ? (
        <Modal title={t("Hướng dẫn")} onClose={() => setIsOpen(false)}>
          <ol className="space-y-4">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="shrink-0 font-semibold text-muted">
                  {index + 1}.
                </span>
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {t(step.title)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {t(step.description)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsOpen(false)}>{t("Đã hiểu")}</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
