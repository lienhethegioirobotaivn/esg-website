export const ADMIN_ROLES = ["admin", "content", "ops"] as const;
export const OTP_PURPOSES = ["email_verification"] as const;
export const QUESTION_BANK_STATUSES = ["draft", "published", "archived"] as const;
export const QUESTION_TRACKS = ["profile", "core", "sector"] as const;
export const QUESTION_TIERS = ["basic", "extended"] as const;
export const QUESTION_REVIEW_STATUSES = ["pending", "approved"] as const;
export const SECTOR_CODES = ["MAN", "RET", "SER", "ICT", "CON", "AGR", "EDU", "OTH"] as const;
export const HEADCOUNT_TIERS = ["lt-10", "10-49", "50-199", "200-499", "gte-500"] as const;
export const CONSENT_KINDS = ["advisory", "verification", "matching", "research"] as const;
export const LOCALES = ["vi", "en", "fr", "zh"] as const;
export const TRANSLATION_LOCALES = ["en", "fr", "zh"] as const;
export const REPORT_STATUSES = ["draft", "exported"] as const;
export const REPORT_BRANDS = ["default", "brand"] as const;
export const FILE_KINDS = [
  "logo",
  "evidence",
  "export_pdf",
  "export_docx",
  "post_image",
  "post_cover",
] as const;
export const INQUIRY_KINDS = ["consulting", "verification"] as const;
export const INQUIRY_STATUSES = [
  "new",
  "contacting",
  "awaiting_customer",
  "scheduled",
  "quoted",
  "in_progress",
  "done",
  "declined",
  "invalid",
] as const;
export const INQUIRY_PRIORITIES = ["normal", "high", "urgent"] as const;
export const CONTACT_CONSENTS = ["yes", "no", "unconfirmed"] as const;
export const POST_STATUSES = ["draft", "published"] as const;
export const EMAIL_STATUSES = ["pending", "sent", "failed"] as const;
export const ACTOR_TYPES = ["user", "admin", "system"] as const;
export const JOB_STATUSES = ["running", "succeeded", "failed"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type OtpPurpose = (typeof OTP_PURPOSES)[number];
export type QuestionBankStatus = (typeof QUESTION_BANK_STATUSES)[number];
export type QuestionTrack = (typeof QUESTION_TRACKS)[number];
export type QuestionTier = (typeof QUESTION_TIERS)[number];
export type QuestionReviewStatus = (typeof QUESTION_REVIEW_STATUSES)[number];
export type SectorCode = (typeof SECTOR_CODES)[number];
export type HeadcountTier = (typeof HEADCOUNT_TIERS)[number];
export type ConsentKind = (typeof CONSENT_KINDS)[number];
export type Locale = (typeof LOCALES)[number];
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportBrand = (typeof REPORT_BRANDS)[number];
export type FileKind = (typeof FILE_KINDS)[number];
export type InquiryKind = (typeof INQUIRY_KINDS)[number];
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export type InquiryPriority = (typeof INQUIRY_PRIORITIES)[number];
export type ContactConsent = (typeof CONTACT_CONSENTS)[number];
export type PostStatus = (typeof POST_STATUSES)[number];
export type EmailStatus = (typeof EMAIL_STATUSES)[number];
export type ActorType = (typeof ACTOR_TYPES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
