export const industryOptions = [
  { value: "manufacturing", label: "Sản xuất" },
  { value: "retail", label: "Thương mại & bán lẻ" },
  { value: "services", label: "Dịch vụ" },
  { value: "it", label: "Công nghệ thông tin" },
  { value: "construction", label: "Xây dựng & bất động sản" },
  { value: "agriculture", label: "Nông nghiệp & thực phẩm" },
  { value: "education", label: "Giáo dục & đào tạo" },
  { value: "other", label: "Khác" },
] as const satisfies readonly { value: string; label: string }[];

export const headcountOptions = [
  { value: "lt-10", label: "Dưới 10 người" },
  { value: "10-49", label: "10 – 49 người" },
  { value: "50-199", label: "50 – 199 người" },
  { value: "200-499", label: "200 – 499 người" },
  { value: "gte-500", label: "Từ 500 người" },
] as const satisfies readonly { value: string; label: string }[];
