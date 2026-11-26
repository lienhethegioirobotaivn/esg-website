ALTER TABLE "companies" ADD COLUMN "care_status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "next_contact_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "first_contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "care_note" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "assigned_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "kind" text DEFAULT 'invite' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "source" text DEFAULT 'website' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_assigned_admin_id_admin_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_care_status_idx" ON "companies" USING btree ("care_status");--> statement-breakpoint
CREATE INDEX "companies_assigned_admin_id_idx" ON "companies" USING btree ("assigned_admin_id");--> statement-breakpoint
CREATE INDEX "feedbacks_kind_created_at_idx" ON "feedbacks" USING btree ("kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "feedbacks_invite_report_key" ON "feedbacks" USING btree ("report_id") WHERE "feedbacks"."kind" = 'invite';--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_code_key" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_care_status_check" CHECK ("companies"."care_status" in ('new', 'contacting', 'following_up', 'converted', 'closed'));--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_kind_check" CHECK ("feedbacks"."kind" in ('direct', 'invite'));--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_rating_check" CHECK ("feedbacks"."rating" is null or ("feedbacks"."rating" between 1 and 5));