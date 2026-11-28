export interface AdminSettingsView {
  feedbackInviteDelayDays: number;
  inquiryNotifyEmail: string | null;
  defaults: {
    feedbackInviteDelayDays: number;
    inquiryNotifyEmail: string | null;
  };
}

export const FEEDBACK_INVITE_DELAY_LIMITS = { min: 1, max: 29 } as const;

export interface JobRunView {
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt: string | null;
  detail: Record<string, unknown> | null;
}

export interface JobView {
  name: string;
  intervalSeconds: number;
  tracked: boolean;
  lastRun: JobRunView | null;
}

export interface OutboxItem {
  id: string;
  toEmail: string;
  template: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
  nextAttemptAt: string;
  canRetry: boolean;
}

export interface OutboxList {
  items: OutboxItem[];
  total: number;
  counts: { pending: number; sent: number; failed: number };
}

export interface FileHealth {
  checkedAt: string;
  kinds: { kind: string; count: number; bytes: number }[];
  missing: { id: string; kind: string; originalName: string | null; createdAt: string }[];
  missingTotal: number;
  untracked: { count: number; bytes: number; removable: number };
  pendingPurge: number;
}

export interface AssigneeView {
  id: string;
  name: string;
  role: "admin" | "content" | "ops";
}
