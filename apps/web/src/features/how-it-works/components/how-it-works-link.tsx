"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Button, Modal } from "@/components/ui";

import { HOW_IT_WORKS_STEPS } from "../constants";

export function HowItWorksLink() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <span>Cách hoạt động</span>
        <ArrowUpRight className="h-4 w-4" />
      </button>

      {isOpen ? (
        <Modal title="Cách hoạt động" onClose={() => setIsOpen(false)}>
          <ol className="space-y-4">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="shrink-0 font-semibold text-muted">
                  {index + 1}.
                </span>
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsOpen(false)}>Đã hiểu</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
