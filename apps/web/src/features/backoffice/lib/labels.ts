import { BANK_SOURCE_LABELS } from "@esg/shared";

import type {
  AdminRole,
  CareStatus,
  InquiryKind,
  InquiryPriority,
  InquiryStatus,
} from "./types";

export type Tone = "gray" | "green" | "amber" | "red" | "blue";

export const ROLE_LABELS: Readonly<Record<AdminRole, string>> = {
  admin: "Quản trị viên",
  content: "Biên tập nội dung",
  ops: "Vận hành",
};

export const ROLE_DESCRIPTIONS: Readonly<Record<AdminRole, string>> = {
  admin: "Dùng được mọi mục, kể cả tài khoản và cài đặt hệ thống.",
  content: "Bài viết, số liệu, bản dịch và bộ câu hỏi.",
  ops: "Yêu cầu tư vấn, doanh nghiệp và phản hồi.",
};

export const INQUIRY_KIND_LABELS: Readonly<Record<InquiryKind, string>> = {
  consulting: "Tư vấn",
  verification: "Kiểm định",
};

export const INQUIRY_STATUS_LABELS: Readonly<Record<InquiryStatus, string>> = {
  new: "Mới tiếp nhận",
  contacting: "Đang liên hệ",
  awaiting_customer: "Chờ khách phản hồi",
  scheduled: "Đã hẹn tư vấn",
  quoted: "Đã gửi báo giá",
  in_progress: "Đang thực hiện",
  done: "Hoàn tất",
  declined: "Không tiếp tục",
  invalid: "Trùng / không hợp lệ",
};

export const INQUIRY_STATUS_TONES: Readonly<Record<InquiryStatus, Tone>> = {
  new: "amber",
  contacting: "blue",
  awaiting_customer: "blue",
  scheduled: "blue",
  quoted: "blue",
  in_progress: "blue",
  done: "green",
  declined: "gray",
  invalid: "gray",
};

export const PRIORITY_LABELS: Readonly<Record<InquiryPriority, string>> = {
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
};

export const PRIORITY_TONES: Readonly<Record<InquiryPriority, Tone>> = {
  normal: "gray",
  high: "amber",
  urgent: "red",
};

export const CONTACT_CONSENT_LABELS = {
  yes: "Có",
  no: "Không",
  unconfirmed: "Chưa xác nhận",
} as const;

export const CARE_STATUS_LABELS: Readonly<Record<CareStatus, string>> = {
  new: "Mới",
  contacting: "Đang liên hệ",
  following_up: "Đang theo dõi",
  converted: "Đã thành khách hàng",
  closed: "Đã đóng",
};

export const CARE_STATUS_TONES: Readonly<Record<CareStatus, Tone>> = {
  new: "amber",
  contacting: "blue",
  following_up: "blue",
  converted: "green",
  closed: "gray",
};

export const FEEDBACK_KIND_LABELS = {
  direct: "Gửi trực tiếp",
  invite: "Qua thư mời",
} as const;

const HEADCOUNT_LABELS: Readonly<Record<string, string>> = {
  "lt-10": "Dưới 10 người",
  "10-49": "10–49 người",
  "50-199": "50–199 người",
  "200-499": "200–499 người",
  "gte-500": "Từ 500 người",
};

const REPORT_STATUS_LABELS: Readonly<Record<string, string>> = {
  draft: "Bản nháp",
  exported: "Đã xuất",
};

const CONSENT_KIND_LABELS: Readonly<Record<string, string>> = {
  advisory: "Nhận tư vấn",
  verification: "Kiểm định",
  matching: "Kết nối đối tác",
  research: "Nghiên cứu",
};

function lookup(
  labels: Readonly<Record<string, string>>,
  value: string | null,
): string {
  return value === null || value === "" ? "" : (labels[value] ?? value);
}

export const headcountLabel = (value: string | null) =>
  lookup(HEADCOUNT_LABELS, value);

export const sectorLabel = (value: string | null) =>
  lookup(BANK_SOURCE_LABELS, value);

export const reportStatusLabel = (value: string | null) =>
  lookup(REPORT_STATUS_LABELS, value);

export const consentKindLabel = (value: string | null) =>
  lookup(CONSENT_KIND_LABELS, value);

export function toOptions<K extends string>(
  labels: Readonly<Record<K, string>>,
): { value: K; label: string }[] {
  return (Object.entries(labels) as [K, string][]).map(([value, label]) => ({
    value,
    label,
  }));
}
