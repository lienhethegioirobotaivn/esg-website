import { z } from "zod";

export const POST_SECTIONS = ["thanh-tuu", "tin-tuc"] as const;

export type PostSection = (typeof POST_SECTIONS)[number];

export const POST_STATUSES = ["published", "draft"] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_URL_PATTERN = /^https:\/\/[^\s"'()<>\\]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const postBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string().trim().min(1, "Đoạn văn không được để trống").max(5000),
  }),
  z.object({
    type: z.literal("heading"),
    text: z.string().trim().min(1, "Tiêu đề mục không được để trống").max(200),
  }),
  z.object({
    type: z.literal("callout"),
    title: z.string().trim().min(1, "Tiêu đề khung nổi bật không được để trống").max(200),
    text: z.string().trim().min(1, "Nội dung khung nổi bật không được để trống").max(2000),
  }),
]);

export type PostBlock = z.infer<typeof postBlockSchema>;

export const postInputSchema = z.object({
  id: z.string().trim().max(60).optional(),
  section: z.enum(POST_SECTIONS, { message: "Mục không hợp lệ" }),
  slug: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập đường dẫn")
    .max(120, "Đường dẫn tối đa 120 ký tự")
    .regex(SLUG_PATTERN, "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang"),
  category: z.string().trim().min(1, "Vui lòng chọn chuyên mục").max(60),
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề").max(200, "Tiêu đề tối đa 200 ký tự"),
  summary: z.string().trim().min(1, "Vui lòng nhập tóm tắt").max(600, "Tóm tắt tối đa 600 ký tự"),
  coverUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || IMAGE_URL_PATTERN.test(value), "Liên kết ảnh không hợp lệ"),
  author: z.string().trim().min(1, "Vui lòng nhập tác giả").max(100),
  readMinutes: z.number().int("Phút đọc phải là số nguyên").min(1, "Tối thiểu 1 phút").max(120),
  publishedAt: z.string().regex(DATE_PATTERN, "Ngày đăng không hợp lệ"),
  featured: z.boolean(),
  popular: z.boolean(),
  spotlight: z.boolean(),
  status: z.enum(POST_STATUSES),
  body: z.array(postBlockSchema).max(100, "Tối đa 100 khối nội dung"),
});

export type PostInput = z.infer<typeof postInputSchema>;

export const statItemSchema = z.object({
  value: z.string().trim().min(1, "Vui lòng nhập giá trị").max(20, "Giá trị tối đa 20 ký tự"),
  label: z.string().trim().min(1, "Vui lòng nhập nhãn").max(80, "Nhãn tối đa 80 ký tự"),
});

export const statsInputSchema = z.object({
  items: z.array(statItemSchema).max(8, "Tối đa 8 số liệu"),
});

export type StatItem = z.infer<typeof statItemSchema>;

export const likeInputSchema = z.object({
  section: z.enum(POST_SECTIONS),
  slug: z.string().trim().min(1).max(120).regex(SLUG_PATTERN),
  delta: z.union([z.literal(1), z.literal(-1)]),
});
