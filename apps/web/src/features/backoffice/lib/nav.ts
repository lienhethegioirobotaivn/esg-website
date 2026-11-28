import type { AdminRole } from "./types";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavSection {
  title: string;
  hint: string;
  roles: readonly AdminRole[];
  items: readonly NavItem[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "Khách hàng",
    hint: "Vận hành",
    roles: ["admin", "ops"],
    items: [
      { href: "/quan-tri/yeu-cau", label: "Yêu cầu tư vấn" },
      { href: "/quan-tri/doanh-nghiep", label: "Doanh nghiệp" },
      { href: "/quan-tri/phan-hoi", label: "Phản hồi" },
    ],
  },
  {
    title: "Nội dung",
    hint: "Biên tập",
    roles: ["admin", "content"],
    items: [
      { href: "/quan-tri/bai-viet", label: "Bài viết" },
      { href: "/quan-tri/so-lieu", label: "Số liệu thành tựu" },
      { href: "/quan-tri/ban-dich", label: "Bản dịch" },
    ],
  },
  {
    title: "Khảo sát",
    hint: "Biên tập",
    roles: ["admin", "content"],
    items: [{ href: "/quan-tri/bo-cau-hoi", label: "Bộ câu hỏi" }],
  },
  {
    title: "Hệ thống",
    hint: "Chỉ quản trị viên",
    roles: ["admin"],
    items: [
      { href: "/quan-tri/tai-khoan", label: "Tài khoản" },
      { href: "/quan-tri/he-thong", label: "Trạng thái và cài đặt" },
    ],
  },
  {
    title: "Giải pháp carbon",
    hint: "Bản mẫu, chưa lưu dữ liệu",
    roles: ["admin", "content", "ops"],
    items: [
      { href: "/quan-tri/trong-rung", label: "Trồng rừng" },
      { href: "/quan-tri/tin-chi-carbon", label: "Tín chỉ carbon" },
    ],
  },
];

export function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function visibleSections(role: AdminRole): readonly NavSection[] {
  return NAV_SECTIONS.filter((section) => section.roles.includes(role));
}

export function canAccess(role: AdminRole, pathname: string): boolean {
  const section = NAV_SECTIONS.find((candidate) =>
    candidate.items.some((item) => isCurrentPath(pathname, item.href)),
  );
  return section === undefined || section.roles.includes(role);
}

export function homePath(role: AdminRole): string {
  return role === "content" ? "/quan-tri/bai-viet" : "/quan-tri/yeu-cau";
}
