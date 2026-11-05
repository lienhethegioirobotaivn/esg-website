# ESGstudio

Website khảo sát ESG miễn phí cho doanh nghiệp. Doanh nghiệp điền thông tin, trả lời bộ câu hỏi theo ngành và quy mô, rồi xuất báo cáo PDF theo mẫu. Bối cảnh chi tiết và các quyết định đã chốt nằm ở [docs/boi-canh-du-an.md](docs/boi-canh-du-an.md).

## Trạng thái

| Hạng mục | Trạng thái |
| --- | --- |
| `apps/web` (Next.js) | Chạy với dữ liệu thật từ Google Sheet |
| Bộ câu hỏi | Đọc từ Google Sheet, chỉ câu "Đã duyệt", theo ngành và quy mô nhân sự |
| Lưu doanh nghiệp | Apps Script ghi vào Sheet "Data khách hàng", logo lưu Google Drive |
| Bản nháp | Lưu trong trình duyệt (`localStorage`): câu trả lời, ghi chú, thông tin doanh nghiệp; tệp bằng chứng chưa lưu |
| Kế hoạch cải thiện ESG | Nhập trên web, lưu trong trình duyệt, chưa lên Sheet |
| Báo cáo PDF | Tạo ngay trên trình duyệt (`@react-pdf/renderer`), theo mẫu của sếp |
| `apps/api` | Không dùng (đã thay bằng Sheet và Apps Script) |
| `/admin` | Ẩn khỏi giao diện, giữ mã nguồn |
| Chấm điểm | Chưa làm |

## Công nghệ

- TypeScript nghiêm ngặt, không `any`.
- Next.js (App Router), Tailwind CSS v4, lucide-react, zod 4.
- `@react-pdf/renderer`, phông DejaVu Sans ở `apps/web/public/fonts`.
- Google Sheet (gviz CSV) và Google Apps Script làm nguồn dữ liệu và nơi lưu.
- pnpm workspace.

## Yêu cầu môi trường

- Node.js 20.9 trở lên.
- pnpm theo `packageManager` ở `package.json` gốc (`corepack enable` nếu chưa có).

## Bắt đầu

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:3000`.

## Biến môi trường

Đặt trong `apps/web/.env.local`. Không đưa giá trị thật vào git.

| Biến | Ý nghĩa |
| --- | --- |
| `GOOGLE_SHEET_QUESTIONS_ID` | Id Google Sheet chứa bộ câu hỏi |
| `GOOGLE_APPS_SCRIPT_URL` | Địa chỉ web app Apps Script để lưu doanh nghiệp |
| `GOOGLE_APPS_SCRIPT_SECRET` | Mã bí mật, trùng với Script Properties trong Apps Script |
| `SURVEY_REVALIDATE_SECONDS` | Thời gian cache bộ câu hỏi (mặc định 300 giây) |

Biến tùy chọn để trống được xem như chưa đặt. Hướng dẫn cài Apps Script: [docs/huong-dan-cai-dat-apps-script.md](docs/huong-dan-cai-dat-apps-script.md).

## Lệnh thường dùng

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm dev` | Chạy `apps/web` ở chế độ phát triển |
| `pnpm build` | Build `apps/web` cho production |
| `pnpm typecheck` | Kiểm tra kiểu ở mọi package |
| `pnpm lint` | Chạy ESLint ở mọi package |

Test của `@esg/shared`: chạy trong `packages/shared` bằng `tsx --test`.

## Cấu trúc thư mục

```
.
├── apps/web/src/
│   ├── app/            Route: (public) là trang khảo sát, api/company lưu doanh nghiệp
│   ├── components/     ui (thành phần cơ bản) và layout
│   ├── features/
│   │   ├── survey/     Tab ESG, câu hỏi, tiến độ, bản nháp, kế hoạch cải thiện, báo cáo PDF
│   │   ├── company/    Form thông tin doanh nghiệp
│   │   ├── evidence/   Tải bằng chứng
│   │   ├── guidance/   Cột hướng dẫn bên phải
│   │   ├── leave-guard/ Cảnh báo khi rời trang với bản nháp chưa lưu
│   │   └── admin/      Quản trị (đang ẩn)
│   └── server/         Đọc Google Sheet, dựng bộ câu hỏi, lưu doanh nghiệp (chỉ chạy phía server)
├── packages/shared/    @esg/shared: kiểu, quy tắc câu trả lời, model báo cáo, test
├── docs/               Tài liệu và mã Apps Script
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Cấu trúc trên theo các file đã làm việc; kiểm tra lại với repo thực tế khi cần.

## Luồng dữ liệu

1. Trang chủ đọc bộ câu hỏi từ Google Sheet (cache 5 phút), chọn câu theo ngành và quy mô nhân sự.
2. Người dùng điền thông tin doanh nghiệp; "Lưu thông tin doanh nghiệp" gửi `POST /api/company` sang Apps Script và cũng ghi bản nháp trình duyệt.
3. Câu trả lời, ghi chú và bằng chứng nằm trong trình duyệt. Có nút lưu bản nháp.
4. Xuất báo cáo: lưu doanh nghiệp, dựng model bằng `buildReportModel`, dựng PDF bằng `ReportDocument` (hai lượt để có số trang mục lục).

## Quy ước

- Không dùng `any`; dữ liệu ngoài qua Zod. ESLint bật `no-explicit-any` và `no-non-null-assertion`.
- Tổ chức theo tính năng; kiểu và schema dùng chung đặt ở `@esg/shared`.
- Màu, bo góc dùng token trong `apps/web/src/app/globals.css`.
- Giao diện bằng tiếng Việt; không có nhãn "miễn phí".
- Commit theo Conventional Commits, có scope, viết bằng tiếng Anh. Ví dụ: `feat(report): add plan card`.

## Tài liệu

- [Bối cảnh dự án](docs/boi-canh-du-an.md)
- [Cài đặt Apps Script](docs/huong-dan-cai-dat-apps-script.md)
- [Quản trị bộ câu hỏi trong Sheet](docs/huong-dan-quan-tri-bo-cau-hoi.md)
- [So sánh báo cáo xuất và mẫu](docs/so-sanh-bao-cao-xuat-va-mau.md)
- [Đối chiếu biến mẫu và nguồn dữ liệu](docs/doi-chieu-bien-mau-nguon-du-lieu.md)
- `docs/backend-spec.md` là tài liệu cũ về backend Express, không còn đúng với kiến trúc hiện tại.
