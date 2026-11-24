CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_key" UNIQUE("email"),
	CONSTRAINT "admin_users_email_lowercase" CHECK ("admin_users"."email" = lower("admin_users"."email")),
	CONSTRAINT "admin_users_role_check" CHECK ("admin_users"."role" in ('admin', 'content', 'ops'))
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"purpose" text DEFAULT 'email_verification' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "otp_challenges_email_lowercase" CHECK ("otp_challenges"."email" = lower("otp_challenges"."email")),
	CONSTRAINT "otp_challenges_purpose_check" CHECK ("otp_challenges"."purpose" in ('email_verification'))
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limits_pkey" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"tax_code" text,
	"legal_form" text,
	"countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"primary_sector" text,
	"secondary_sectors" text[] DEFAULT '{}'::text[] NOT NULL,
	"headcount_tier" text,
	"revenue_band" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"logo_file_id" uuid,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_primary_sector_check" CHECK ("companies"."primary_sector" in ('MAN', 'RET', 'SER', 'ICT', 'CON', 'AGR', 'EDU', 'OTH')),
	CONSTRAINT "companies_headcount_tier_check" CHECK ("companies"."headcount_tier" in ('lt-10', '10-49', '50-199', '200-499', 'gte-500'))
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"granted" boolean NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"text_version" text NOT NULL,
	"form_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consents_kind_check" CHECK ("consents"."kind" in ('advisory', 'verification', 'matching', 'research'))
);
--> statement-breakpoint
CREATE TABLE "post_files" (
	"post_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_files_pkey" PRIMARY KEY("post_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"post_id" uuid NOT NULL,
	"voter_key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_pkey" PRIMARY KEY("post_id","voter_key_hash")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" jsonb NOT NULL,
	"cover_file_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"author_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_locale_check" CHECK ("posts"."locale" in ('vi', 'en', 'fr', 'zh')),
	CONSTRAINT "posts_status_check" CHECK ("posts"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "site_stats" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"source_hash" text NOT NULL,
	"locale" text NOT NULL,
	"source_text" text NOT NULL,
	"auto_text" text,
	"manual_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_pkey" PRIMARY KEY("source_hash","locale"),
	CONSTRAINT "translations_locale_check" CHECK ("translations"."locale" in ('en', 'fr', 'zh')),
	CONSTRAINT "translations_source_hash_check" CHECK ("translations"."source_hash" ~ '^[0-9a-f]{16}$')
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"report_id" uuid,
	"export_id" uuid,
	"token_hash" text,
	"invite_sent_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"rating" smallint,
	"comment" text,
	"form_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"form_version" text,
	"company_id" uuid,
	"company_name" text NOT NULL,
	"headcount_tier" text,
	"sector" text,
	"contact_phone" text,
	"contact_email" text,
	"message" text,
	"contact_consent" text DEFAULT 'unconfirmed' NOT NULL,
	"contact_consent_at" timestamp with time zone,
	"assigned_admin_id" uuid,
	"first_contacted_at" timestamp with time zone,
	"follow_up_at" timestamp with time zone,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_code_key" UNIQUE("code"),
	CONSTRAINT "inquiries_kind_check" CHECK ("inquiries"."kind" in ('consulting', 'verification')),
	CONSTRAINT "inquiries_status_check" CHECK ("inquiries"."status" in ('new', 'contacting', 'awaiting_customer', 'scheduled', 'quoted', 'in_progress', 'done', 'declined', 'invalid')),
	CONSTRAINT "inquiries_priority_check" CHECK ("inquiries"."priority" in ('normal', 'high', 'urgent')),
	CONSTRAINT "inquiries_headcount_tier_check" CHECK ("inquiries"."headcount_tier" in ('lt-10', '10-49', '50-199', '200-499', 'gte-500')),
	CONSTRAINT "inquiries_sector_check" CHECK ("inquiries"."sector" in ('MAN', 'RET', 'SER', 'ICT', 'CON', 'AGR', 'EDU', 'OTH')),
	CONSTRAINT "inquiries_contact_consent_check" CHECK ("inquiries"."contact_consent" in ('yes', 'no', 'unconfirmed'))
);
--> statement-breakpoint
CREATE TABLE "inquiry_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"admin_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"report_id" uuid NOT NULL,
	"question_code" text NOT NULL,
	"file_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_files_report_question_file_key" UNIQUE("report_id","question_code","file_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"storage_key" text NOT NULL,
	"kind" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"owner_user_id" uuid,
	"original_name" text,
	"referenced_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_storage_key_key" UNIQUE("storage_key"),
	CONSTRAINT "files_kind_check" CHECK ("files"."kind" in ('logo', 'evidence', 'export_pdf', 'export_docx', 'post_image', 'post_cover')),
	CONSTRAINT "files_size_check" CHECK ("files"."size" >= 0),
	CONSTRAINT "files_sha256_check" CHECK ("files"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "question_banks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"version" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_banks_version_key" UNIQUE("version"),
	CONSTRAINT "question_banks_status_check" CHECK ("question_banks"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "question_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"bank_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"track" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_groups_track_check" CHECK ("question_groups"."track" in ('profile', 'core', 'sector'))
);
--> statement-breakpoint
CREATE TABLE "question_texts" (
	"question_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	"guidance" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_texts_pkey" PRIMARY KEY("question_id","locale"),
	CONSTRAINT "question_texts_locale_check" CHECK ("question_texts"."locale" in ('vi', 'en', 'fr', 'zh'))
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"bank_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"topic" text,
	"input_type" text NOT NULL,
	"text" text NOT NULL,
	"guidance" text,
	"evidence_hint" text,
	"declaration_level" text NOT NULL,
	"route" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_rule" jsonb,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"position" integer NOT NULL,
	"source_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_declaration_level_check" CHECK ("questions"."declaration_level" in ('basic', 'extended')),
	CONSTRAINT "questions_review_status_check" CHECK ("questions"."review_status" in ('pending', 'approved'))
);
--> statement-breakpoint
CREATE TABLE "report_drafts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"report_id" uuid,
	"data" jsonb NOT NULL,
	"schema_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_drafts_user_report_key" UNIQUE NULLS NOT DISTINCT("user_id","report_id")
);
--> statement-breakpoint
CREATE TABLE "report_exports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"export_code" text NOT NULL,
	"report_id" uuid NOT NULL,
	"bank_version_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"pdf_file_id" uuid,
	"docx_file_id" uuid,
	"locale" text NOT NULL,
	"brand" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_exports_export_code_key" UNIQUE("export_code"),
	CONSTRAINT "report_exports_locale_check" CHECK ("report_exports"."locale" in ('vi', 'en', 'fr', 'zh')),
	CONSTRAINT "report_exports_brand_check" CHECK ("report_exports"."brand" in ('default', 'brand'))
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"code" text NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"bank_version_id" uuid NOT NULL,
	"last_export_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_code_key" UNIQUE("code"),
	CONSTRAINT "reports_status_check" CHECK ("reports"."status" in ('draft', 'exported'))
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_actor_type_check" CHECK ("audit_logs"."actor_type" in ('user', 'admin', 'system'))
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"to_email" text NOT NULL,
	"template" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_outbox_status_check" CHECK ("email_outbox"."status" in ('pending', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_runs_status_check" CHECK ("job_runs"."status" in ('running', 'succeeded', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_logo_file_id_files_id_fk" FOREIGN KEY ("logo_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_files" ADD CONSTRAINT "post_files_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_files" ADD CONSTRAINT "post_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_file_id_files_id_fk" FOREIGN KEY ("cover_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_admin_id_admin_users_id_fk" FOREIGN KEY ("author_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_export_id_report_exports_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."report_exports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_admin_id_admin_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_bank_id_question_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_texts" ADD CONSTRAINT "question_texts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_bank_id_question_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_group_id_question_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."question_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_drafts" ADD CONSTRAINT "report_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_drafts" ADD CONSTRAINT "report_drafts_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_bank_version_id_question_banks_id_fk" FOREIGN KEY ("bank_version_id") REFERENCES "public"."question_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_pdf_file_id_files_id_fk" FOREIGN KEY ("pdf_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_docx_file_id_files_id_fk" FOREIGN KEY ("docx_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_bank_version_id_question_banks_id_fk" FOREIGN KEY ("bank_version_id") REFERENCES "public"."question_banks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_email_created_at_idx" ON "otp_challenges" USING btree ("email","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "companies_user_id_idx" ON "companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "companies_tax_code_idx" ON "companies" USING btree ("tax_code");--> statement-breakpoint
CREATE INDEX "companies_created_at_idx" ON "companies" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consents_company_kind_idx" ON "consents" USING btree ("company_id","kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "post_files_file_id_idx" ON "post_files" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_locale_key" ON "posts" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "posts_status_published_at_idx" ON "posts" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_cover_file_id_idx" ON "posts" USING btree ("cover_file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedbacks_token_hash_key" ON "feedbacks" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "feedbacks_report_id_idx" ON "feedbacks" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "feedbacks_export_id_idx" ON "feedbacks" USING btree ("export_id");--> statement-breakpoint
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_kind_created_at_idx" ON "inquiries" USING btree ("kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_assigned_admin_id_idx" ON "inquiries" USING btree ("assigned_admin_id");--> statement-breakpoint
CREATE INDEX "inquiries_company_id_idx" ON "inquiries" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "inquiry_notes_inquiry_created_at_idx" ON "inquiry_notes" USING btree ("inquiry_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "evidence_files_file_id_idx" ON "evidence_files" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "files_owner_user_id_idx" ON "files" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "files_unreferenced_idx" ON "files" USING btree ("created_at") WHERE "files"."referenced_at" is null and "files"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "files_deleted_at_idx" ON "files" USING btree ("deleted_at") WHERE "files"."deleted_at" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "question_banks_single_published_idx" ON "question_banks" USING btree ("status") WHERE "question_banks"."status" = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "question_groups_bank_code_key" ON "question_groups" USING btree ("bank_id","code");--> statement-breakpoint
CREATE INDEX "question_groups_bank_position_idx" ON "question_groups" USING btree ("bank_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_bank_code_key" ON "questions" USING btree ("bank_id","code");--> statement-breakpoint
CREATE INDEX "questions_bank_group_position_idx" ON "questions" USING btree ("bank_id","group_id","position");--> statement-breakpoint
CREATE INDEX "report_drafts_updated_at_idx" ON "report_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "report_exports_report_created_at_idx" ON "report_exports" USING btree ("report_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "report_exports_bank_version_id_idx" ON "report_exports" USING btree ("bank_version_id");--> statement-breakpoint
CREATE INDEX "reports_owner_updated_at_idx" ON "reports" USING btree ("owner_user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_company_id_idx" ON "reports" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "reports_bank_version_id_idx" ON "reports" USING btree ("bank_version_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "email_outbox_pending_idx" ON "email_outbox" USING btree ("next_attempt_at") WHERE "email_outbox"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "email_outbox_sent_at_idx" ON "email_outbox" USING btree ("sent_at") WHERE "email_outbox"."status" = 'sent';--> statement-breakpoint
CREATE INDEX "job_runs_job_started_at_idx" ON "job_runs" USING btree ("job","started_at" DESC NULLS LAST);