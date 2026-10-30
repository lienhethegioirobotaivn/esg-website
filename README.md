# ESGstudio

Website khảo sát ESG nội bộ miễn phí cho doanh nghiệp. Người quản trị tạo bộ câu hỏi ở `/admin`, người dùng điền thông tin doanh nghiệp và trả lời bộ câu hỏi ở trang chủ. Bộ câu hỏi gồm ba phần cố định (**Môi trường**, **Xã hội**, **Quản trị**), mỗi phần có nhiều nhóm, mỗi nhóm có nhiều câu. Mỗi câu có ba trạng thái: **Đã thực hiện**, **Đang thực hiện**, **Chưa thực hiện**. Chọn **Đã thực hiện** thì kèm mô tả và bằng chứng (tối đa 10 tệp PDF hoặc ảnh).

## Trạng thái

| Hạng mục | Trạng thái |
| --- | --- |
| `apps/web` (Next.js) | Hoàn thiện giao diện, chạy bằng dữ liệu mock |
| `apps/api` (Express + Drizzle) | Chưa tạo |
| `packages/shared` | Có: hằng số, schema Zod, kiểu dữ liệu dùng chung |
| Bản nháp của người dùng | Có, lưu trong trình duyệt (`localStorage`): câu trả lời, mô tả, thông tin doanh nghiệp. Tệp bằng chứng chưa được lưu |
| Lưu lên máy chủ | Chưa có. Bộ câu hỏi do admin chỉnh chỉ nằm trong bộ nhớ trình duyệt, tải lại trang là mất |
| Chấm điểm | Chưa làm (xem mục TODO) |
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
│   │       │   ├── survey/     3 tab ESG, nhóm, câu hỏi, tiến độ, bản nháp, store nội dung
│   │       │   ├── company/    Form thông tin doanh nghiệp (kỳ báo cáo, năm báo cáo)
│   │       │   ├── evidence/   Tải bằng chứng
│   │       │   ├── guidance/   Cột hướng dẫn bên phải
│   │       │   ├── leave-guard/ Cảnh báo khi rời trang với bản nháp chưa lưu
│   │       │   ├── locale/     Chuyển ngôn ngữ (chưa có bản dịch)
│   │       │   └── admin/      Quản trị nhóm và câu hỏi
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

Bộ câu hỏi gồm ba cấp: **trụ cột**, **nhóm câu hỏi** thuộc trụ cột, và **câu hỏi** thuộc nhóm.

- Có đúng **3 trụ cột cố định**: Môi trường, Xã hội, Quản trị. Admin không thêm, sửa hay xóa trụ cột. Số nhóm và số câu hỏi thì không giới hạn.
- Bộ câu hỏi hiện tại lấy từ file `Bo_cau_hoi_danh_gia_ESG.docx`: 8 nhóm (2 Môi trường, 3 Xã hội, 3 Quản trị), mỗi nhóm 10 câu, tổng 80 câu.
- Mỗi câu có một **khía cạnh** (`aspect`): hệ thống, vận hành, quy trình, môi trường, khách hàng, xã hội.
- Id của mọi thực thể là UUID. Không có mã câu hỏi kiểu `E001`. Giao diện hiển thị số thứ tự trong nhóm ("Câu 1", "Câu 2"...), tính từ vị trí hiện tại.
- Thứ tự lưu bằng trường `order`.
- Mỗi câu có hai thiết lập do quản trị viên chọn: mô tả và bằng chứng là **bắt buộc** hay **tùy chọn**.
- Câu trả lời: `implemented` (kèm mô tả và bằng chứng), `in_progress`, `not_implemented`.
- Thông tin doanh nghiệp gồm kỳ báo cáo (Quý 1, 2, 3, 4 hoặc Cả năm) và năm báo cáo (nhập số, mặc định năm hiện tại).

Dữ liệu mock nằm trong `apps/web/src/data`. Dữ liệu quản trị viên chỉnh được giữ bằng store ở `features/survey/store`.

## Bản nháp

- Bản nháp lưu trong `localStorage` của trình duyệt (khóa `esg-studio:draft`), gồm thông tin doanh nghiệp, câu trả lời, mô tả và nhóm đang làm.
- Tự lưu khi người dùng trả lời xong một nhóm. Nút **Lưu bản nháp** ở cuối trang để lưu thủ công. Mở lại trang sẽ khôi phục.
- Đóng tab hoặc tải lại khi còn thay đổi chưa lưu: trình duyệt hiện hộp thoại xác nhận của nó. Với liên kết dẫn sang trang khác trong ứng dụng (`GuardedLink`), ứng dụng hiện hộp thoại riêng. Nút Back của trình duyệt chưa được chặn.
- Tệp bằng chứng **chưa** được lưu trong bản nháp (xem TODO).

## TODO

- **Chấm điểm theo nhóm.** File Word có dòng "Điểm: ....../20" ở mỗi nhóm. Cách tính dự kiến: Đã thực hiện 2 điểm, Đang thực hiện 1 điểm, Chưa thực hiện 0 điểm. Đây là suy luận, cần xác nhận trước khi làm.
- **Lưu bằng chứng trong bản nháp.** Cần backend và kho lưu trữ tệp.
- **Lưu lên máy chủ** và đăng nhập `/admin`.
- **Bản dịch** cho bộ chuyển ngôn ngữ.
- Một số câu hỏi trong file Word nhắc tên riêng của một doanh nghiệp cụ thể (ví dụ câu về cổ phiếu LIX). Cần rà soát nếu dùng cho mọi doanh nghiệp.

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

- [Tài liệu kỹ thuật cho backend](docs/backend-spec.md): mô hình dữ liệu, lược đồ Drizzle, danh sách API, cấu trúc `apps/api`, lộ trình triển khai, các TODO.
