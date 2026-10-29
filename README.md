# ESGstudio

Website khảo sát ESG nội bộ miễn phí cho doanh nghiệp. Người quản trị tạo bộ câu hỏi ở `/admin`, người dùng điền thông tin doanh nghiệp và trả lời bộ câu hỏi ở trang chủ. Mỗi câu có ba đáp án: **Có**, **Chưa có**, **Không áp dụng**. Chọn **Có** thì kèm mô tả và bằng chứng (tối đa 10 tệp PDF hoặc ảnh).

## Trạng thái

| Hạng mục | Trạng thái |
| --- | --- |
| `apps/web` (Next.js) | Hoàn thiện giao diện, chạy bằng dữ liệu mock |
| `apps/api` (Express + Drizzle) | Chưa tạo |
| `packages/shared` | Có: hằng số, schema Zod, kiểu dữ liệu dùng chung |
| Lưu dữ liệu | Chưa có. Mọi thay đổi chỉ nằm trong bộ nhớ trình duyệt, tải lại trang là mất |
| Đăng nhập `/admin` | Chưa có |

## Công nghệ

- **Ngôn ngữ:** TypeScript chế độ nghiêm ngặt, không dùng `any`.
- **Frontend:** Next.js (App Router), Tailwind CSS v4, lucide-react, zustand.
- **Validate:** Zod, dùng chung giữa web và api qua `@esg/shared`.
- **Backend (dự kiến):** Express, Drizzle ORM, PostgreSQL.
- **Quản lý gói:** pnpm workspace.

## Yêu cầu môi trường

- Node.js 20.9 trở lên.
- pnpm. Phiên bản được khai báo trong trường `packageManager` ở `package.json` gốc. Nếu chưa có pnpm, chạy `corepack enable`.

## Bắt đầu

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:3000` để làm khảo sát và `http://localhost:3000/admin` để quản trị bộ câu hỏi.

## Lệnh thường dùng

Chạy tại thư mục gốc:

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm dev` | Chạy `apps/web` ở chế độ phát triển |
| `pnpm build` | Build `apps/web` cho production (có kiểm tra kiểu) |
| `pnpm typecheck` | Kiểm tra kiểu TypeScript ở mọi package |
| `pnpm lint` | Chạy ESLint ở mọi package |

Thêm thư viện cho một package cụ thể:

```bash
pnpm --filter web add <ten-goi>
pnpm --filter @esg/shared add <ten-goi>
```

## Cấu trúc thư mục

```
.
├── apps/
│   ├── web/                    Next.js
│   │   └── src/
│   │       ├── app/            Route: (public) là trang khảo sát, admin là trang quản trị
│   │       ├── components/     ui (thành phần cơ bản) và layout (header, footer)
│   │       ├── features/       Chia theo tính năng
│   │       │   ├── survey/     Câu hỏi, nhóm, tiến độ, store nội dung bộ câu hỏi
│   │       │   ├── company/    Form thông tin doanh nghiệp
│   │       │   ├── evidence/   Tải bằng chứng
│   │       │   ├── guidance/   Cột hướng dẫn bên phải
│   │       │   └── admin/      Quản trị trụ cột, nhóm, câu hỏi
│   │       ├── data/           Dữ liệu mock
│   │       └── lib/            Tiện ích dùng chung
│   └── api/                    Express + Drizzle (chưa tạo)
├── packages/
│   └── shared/                 @esg/shared
├── docs/                       Tài liệu kỹ thuật
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Mô hình dữ liệu

Bộ câu hỏi gồm ba cấp: **trụ cột** (Môi trường, Xã hội, Quản trị...), **nhóm câu hỏi** thuộc trụ cột, và **câu hỏi** thuộc nhóm. Số lượng ở mỗi cấp không giới hạn, do quản trị viên thêm.

- Id của mọi thực thể là UUID.
- Không có mã câu hỏi kiểu `E001`. Giao diện hiển thị số thứ tự trong nhóm ("Câu 1", "Câu 2"...), tính từ vị trí hiện tại, nên đổi thứ tự là số đổi theo.
- Thứ tự lưu bằng trường `order`.
- Mỗi câu có hai thiết lập do quản trị viên chọn: mô tả và bằng chứng là **bắt buộc** hay **tùy chọn**.

Giai đoạn này dữ liệu mock nằm trong `apps/web/src/data`. Dữ liệu quản trị viên chỉnh sửa được giữ bằng store ở `features/survey/store`.

## Quy ước

- **Không dùng `any`.** Dữ liệu từ bên ngoài phải qua Zod trước khi dùng. ESLint bật `no-explicit-any` và `no-non-null-assertion`.
- **Tổ chức theo tính năng.** Mỗi feature tự chứa `components`, `hooks`, `lib`, `services`, và chỉ xuất ra ngoài qua `index.ts`.
- **Kiểu và schema dùng chung đặt ở `@esg/shared`.** Không khai báo lại ở `apps/web` hay `apps/api`.
- **Giao diện:** màu, bo góc và bóng khai báo bằng token trong `apps/web/src/app/globals.css`. Không viết mã màu cố định trong component. Font là Be Vietnam Pro.
- **Nội dung giao diện bằng tiếng Việt.**
- **Commit theo Conventional Commits**, có phạm vi (scope), viết bằng tiếng Anh. Ví dụ: `feat(web): add admin page`, `fix(shared): correct group schema`.

## Triển khai

Triển khai tạm `apps/web` lên Vercel:

- **Root Directory:** `apps/web`.
- Bật **Include source files outside of the Root Directory in the Build Step**, vì web phụ thuộc vào `packages/shared`.
- Build Command, Install Command và Output Directory để mặc định.

`apps/api` sau này sẽ triển khai riêng, không chạy trên Vercel.

## Tài liệu

- [Tài liệu kỹ thuật cho backend](docs/backend-spec.md): mô hình dữ liệu, lược đồ Drizzle, danh sách API, cấu trúc `apps/api`, lộ trình triển khai.
