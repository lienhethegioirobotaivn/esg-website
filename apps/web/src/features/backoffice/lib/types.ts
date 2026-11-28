export type AdminRole = "admin" | "content" | "ops";

export interface AdminProfile {
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  lockedUntil: string | null;
  createdAt: string;
}

export type InquiryKind = "consulting" | "verification";

export type InquiryStatus =
  | "new"
  | "contacting"
  | "awaiting_customer"
  | "scheduled"
  | "quoted"
  | "in_progress"
  | "done"
  | "declined"
  | "invalid";

export type InquiryPriority = "normal" | "high" | "urgent";

export interface Inquiry {
  id: string;
  code: string;
  kind: InquiryKind;
  status: InquiryStatus;
  priority: InquiryPriority;
  source: string;
  companyId: string | null;
  companyName: string;
  headcountTier: string | null;
  sector: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  message: string | null;
  contactConsent: "yes" | "no" | "unconfirmed";
  assignedAdminId: string | null;
  firstContactedAt: string | null;
  followUpAt: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryNote {
  id: string;
  body: string;
  adminId: string | null;
  adminName: string | null;
  createdAt: string;
}

export interface InquiryDetail extends Inquiry {
  notes: InquiryNote[];
}

export type CareStatus =
  | "new"
  | "contacting"
  | "following_up"
  | "converted"
  | "closed";

export interface Customer {
  id: string;
  legalName: string;
  tradeName: string | null;
  taxCode: string | null;
  primarySector: string | null;
  headcountTier: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  careStatus: CareStatus;
  nextContactAt: string | null;
  firstContactedAt: string | null;
  careNote: string | null;
  assignedAdminId: string | null;
  createdAt: string;
  reportCount: number;
  advisoryConsent: boolean | null;
}

export interface CustomerDetail extends Customer {
  assignee: { id: string; name: string } | null;
  reports: {
    code: string;
    status: string;
    lastExportAt: string | null;
    createdAt: string;
  }[];
  consents: {
    kind: string;
    granted: boolean;
    grantedAt: string;
    textVersion: string;
  }[];
}

export interface Feedback {
  id: string;
  code: string;
  kind: "direct" | "invite";
  email: string | null;
  rating: number | null;
  comment: string | null;
  reportCode: string | null;
  inviteSentAt: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface FeedbackList {
  items: Feedback[];
  total: number;
  answered: number;
  averageRating: number | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
}
