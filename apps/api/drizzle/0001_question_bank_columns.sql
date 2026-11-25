ALTER TABLE "questions" ADD COLUMN "source" text NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "pillar" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "improvement_hint" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "report_section" text;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_source_check" CHECK ("questions"."source" in ('PROFILE', 'COMMON', 'MAN', 'RET', 'SER', 'ICT', 'CON', 'AGR', 'EDU', 'OTH'));--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_pillar_check" CHECK ("questions"."pillar" is null or "questions"."pillar" in ('E', 'S', 'G'));