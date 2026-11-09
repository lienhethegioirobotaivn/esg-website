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
    title: "Đăng ký tư vấn ESG",
    heading: "Tư vấn hoàn thiện hồ sơ ESG và triển khai cho toàn doanh nghiệp",
    subheading: null,
    notice: null,
    chip: "Tư vấn",
    descriptionPlaceholder: "Mô tả ngắn nhu cầu của doanh nghiệp",
    descriptionMultiline: false,
    submitLabel: "Gửi yêu cầu tư vấn",
    footnote:
      "Thông tin được sử dụng để liên hệ và tư vấn theo nhu cầu của doanh nghiệp.",
  },
  assessment: {
    menuLabel: msg("Kiểm định độc lập"),
    title: "Đăng ký kiểm định độc lập",
    heading: "Tư vấn lộ trình đánh giá và cấp chứng nhận ESG",
    subheading: "Phục vụ yêu cầu đối tác tại Mỹ, EU, Nhật Bản và các thị trường khác",
    notice:
      "Tiêu chuẩn và khả năng cấp chứng nhận phụ thuộc yêu cầu áp dụng và kết quả đánh giá.",
    chip: null,
    descriptionPlaceholder: "Mô tả ngắn nhu cầu đánh giá",
    descriptionMultiline: true,
    submitLabel: "Gửi yêu cầu kiểm định",
    footnote:
      "Đội ngũ sẽ liên hệ để xác định phạm vi và đơn vị đánh giá phù hợp.",
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
