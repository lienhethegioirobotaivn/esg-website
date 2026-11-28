ALTER TABLE "questions" DROP CONSTRAINT "questions_review_status_check";--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "reviewed_on" date;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "rollout_status" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_rollout_status_check" CHECK ("questions"."rollout_status" in ('not_started', 'in_progress', 'testing', 'done'));--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_review_status_check" CHECK ("questions"."review_status" in ('pending', 'changes', 'approved', 'rejected'));