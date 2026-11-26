DROP INDEX "posts_slug_locale_key";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "locale" SET DEFAULT 'vi';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "section" text DEFAULT 'tin-tuc' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "category" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "author_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "read_minutes" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "popular" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "spotlight" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "like_base" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "legacy_code" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "retry_after" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "posts_locale_section_slug_key" ON "posts" USING btree ("locale","section","slug");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_legacy_code_key" UNIQUE("legacy_code");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_section_check" CHECK ("posts"."section" in ('thanh-tuu', 'tin-tuc'));--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_read_minutes_check" CHECK ("posts"."read_minutes" between 1 and 120);--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_like_base_check" CHECK ("posts"."like_base" >= 0);