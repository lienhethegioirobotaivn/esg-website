"use client";

import { feedbackSchema, FEEDBACK_INVITE_DELAY_DAYS } from "@esg/shared";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Field, Input, Textarea } from "@/components/ui";

import { SubmitContactError, submitFeedback } from "../services/submit-contact";

interface FeedbackErrors {
  comment?: string;
  email?: string;
}

export function FeedbackCard() {
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FeedbackErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setSubmitError(null);

    const parsed = feedbackSchema.safeParse({ comment, email });
    if (!parsed.success) {
      const next: FeedbackErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "comment" || key === "email") && !(key in next)) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await submitFeedback({ comment, email });
      setIsDone(true);
    } catch (error) {
      setSubmitError(
        error instanceof SubmitContactError
          ? error.message
          : "Không gửi được ý kiến. Vui lòng thử lại sau.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mt-6 p-5">
      <h2 className="text-base">Góp ý để chúng tôi cải thiện</h2>
      {isDone ? (
        <div role="status" className="mt-3 flex items-start gap-2.5 text-sm">
          <CheckCircle2
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-primary-600"
          />
          <p className="text-muted">Xin cảm ơn ý kiến đóng góp của bạn.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-4">
          <Field
            label="Ý kiến của bạn"
            htmlFor="feedback-comment"
            error={errors.comment}
          >
            <Textarea
              id="feedback-comment"
              rows={3}
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
                setErrors((current) => ({ ...current, comment: undefined }));
              }}
              placeholder="Bạn thấy công cụ cần cải thiện điều gì?"
              aria-invalid={Boolean(errors.comment)}
              aria-describedby={
                errors.comment ? "feedback-comment-error" : undefined
              }
            />
          </Field>
          <Field
            label="Email (không bắt buộc)"
            htmlFor="feedback-email"
            hint={`Nếu để lại email, khoảng ${FEEDBACK_INVITE_DELAY_DAYS} ngày sau chúng tôi sẽ gửi email xin bạn góp ý về trải nghiệm sử dụng.`}
            error={errors.email}
          >
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: undefined }));
              }}
              placeholder="Nhập email của bạn"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "feedback-email-error" : "feedback-email-hint"
              }
            />
          </Field>
          {submitError ? (
            <p role="alert" className="text-sm text-danger-600">
              {submitError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              leadingIcon={
                isSubmitting ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Send aria-hidden className="size-4" />
                )
              }
            >
              {isSubmitting ? "Đang gửi..." : "Gửi góp ý"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
