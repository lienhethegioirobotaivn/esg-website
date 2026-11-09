import type { InquiryKind } from "@esg/shared";

import { msg } from "@/features/locale";

export const HOTLINE_DISPLAY = "0372.831.697";
export const HOTLINE_HREF = "tel:0372831697";

export interface InquiryCopy {
  menuLabel: string;
  title: string;
  heading: string;
  subheading: string | null;
  notice: string | null;
  chip: string | null;
  descriptionPlaceholder: string;
  descriptionMultiline: boolean;
  submitLabel: string;
  footnote: string;
}

export const INQUIRY_COPY: Record<InquiryKind, InquiryCopy> = {
  advisory: {
    menuLabel: msg("Tư vấn"),
    title: msg("Đăng ký tư vấn ESG"),
    heading: msg(
      "Tư vấn hoàn thiện hồ sơ ESG và triển khai cho toàn doanh nghiệp",
    ),
    subheading: null,
    notice: null,
    chip: msg("Tư vấn"),
    descriptionPlaceholder: msg("Mô tả ngắn nhu cầu của doanh nghiệp"),
    descriptionMultiline: false,
    submitLabel: msg("Gửi yêu cầu tư vấn"),
    footnote: msg(
      "Thông tin được sử dụng để liên hệ và tư vấn theo nhu cầu của doanh nghiệp.",
    ),
  },
  assessment: {
    menuLabel: msg("Kiểm định độc lập"),
    title: msg("Đăng ký kiểm định độc lập"),
    heading: msg("Tư vấn lộ trình đánh giá và cấp chứng nhận ESG"),
    subheading: msg(
      "Phục vụ yêu cầu đối tác tại Mỹ, EU, Nhật Bản và các thị trường khác",
    ),
    notice: msg(
      "Tiêu chuẩn và khả năng cấp chứng nhận phụ thuộc yêu cầu áp dụng và kết quả đánh giá.",
    ),
    chip: null,
    descriptionPlaceholder: msg("Mô tả ngắn nhu cầu đánh giá"),
    descriptionMultiline: true,
    submitLabel: msg("Gửi yêu cầu kiểm định"),
    footnote: msg(
      "Đội ngũ sẽ liên hệ để xác định phạm vi và đơn vị đánh giá phù hợp.",
    ),
  },
};

export interface InquiryFormValues {
  name: string;
  description: string;
  headcount: string;
  industry: string;
  phone: string;
  email: string;
}

export const INQUIRY_INITIAL_VALUES: InquiryFormValues = {
  name: "",
  description: "",
  headcount: "",
  industry: "",
  phone: "",
  email: "",
};
