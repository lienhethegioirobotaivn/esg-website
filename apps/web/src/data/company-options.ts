import { msg } from "@/features/locale";

export const industryOptions = [
  { value: "manufacturing", label: msg("Sản xuất") },
  { value: "retail", label: msg("Thương mại & bán lẻ") },
  { value: "services", label: msg("Dịch vụ") },
  { value: "it", label: msg("Công nghệ thông tin") },
  { value: "construction", label: msg("Xây dựng & bất động sản") },
  { value: "agriculture", label: msg("Nông nghiệp & thực phẩm") },
  { value: "education", label: msg("Giáo dục & đào tạo") },
  { value: "other", label: msg("Khác") },
] as const satisfies readonly { value: string; label: string }[];

export const headcountOptions = [
  { value: "lt-10", label: msg("Dưới 10 người") },
  { value: "10-49", label: msg("10 – 49 người") },
  { value: "50-199", label: msg("50 – 199 người") },
  { value: "200-499", label: msg("200 – 499 người") },
  { value: "gte-500", label: msg("Từ 500 người") },
] as const satisfies readonly { value: string; label: string }[];
