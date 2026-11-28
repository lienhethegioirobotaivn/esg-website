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
| Giao diện báo cáo theo thương hiệu | Tùy chọn, tắt mặc định (`ENABLE_BRAND_THEME`): tải ảnh bộ nhận diện, Gemini đề xuất màu, phông và kiểu bìa cho PDF và Word; xem [docs/thuong-hieu-bao-cao.md](docs/thuong-hieu-bao-cao.md) |
| `apps/api` | Bản production v2 (NestJS 12 + Drizzle + PostgreSQL 18). Đã xong giai đoạn 1–7: khung dự án, schema, đăng nhập OTP, gửi thư, ngân hàng câu hỏi, báo cáo và tệp, quản trị và CRM, bài viết, thống kê, bản dịch, giao diện quản trị. Website công khai vẫn dùng Sheet và Apps Script cho tới giai đoạn 8 (trang `/quan-tri` đã gọi API này); thiết kế ở [docs/backend-spec.md](docs/backend-spec.md), lộ trình ở [docs/backend-roadmap.md](docs/backend-roadmap.md) |
| `/admin` | Ẩn khỏi giao diện, giữ mã nguồn |
| Chấm điểm | Chưa làm |

## Công nghệ

- TypeScript nghiêm ngặt, không `any`.
- Next.js (App Router), Tailwind CSS v4, lucide-react, zod 4.
- `@react-pdf/renderer`, phông DejaVu Sans ở `apps/web/public/fonts`.
- Google Sheet (gviz CSV) và Google Apps Script làm nguồn dữ liệu và nơi lưu.
- pnpm workspace.

## Yêu cầu môi trường

- Node.js 24 LTS (`>=24 <25`).
- pnpm theo `packageManager` ở `package.json` gốc (`corepack enable` nếu chưa có).
- Docker (chỉ cần khi chạy `apps/api`, để có PostgreSQL 18).

## Bắt đầu

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:3000`.

## Chạy `apps/api` (bản v2, đang xây)

```bash
pnpm db:up
cp apps/api/.env.example apps/api/.env
pnpm db:migrate
pnpm dev:api
```

Nếu `pnpm db:up` báo lỗi cổng 5432 (`forbidden by its access permissions` trên Windows), tạo file `.env` ở thư mục gốc với `DB_PORT=5433`, rồi đổi cổng thành 5433 trong `DATABASE_URL` của `apps/api/.env` và `TEST_DATABASE_URL`. Kiểm tra cổng bị chặn bằng `netsh interface ipv4 show excludedportrange protocol=tcp`.

Kiểm tra: `http://localhost:3001/api/v1/health` trả `{"status":"ok","database":"up",...}`.

Trang quản trị `http://localhost:3000/quan-tri` cần cả `pnpm dev:api` và `pnpm dev` cùng chạy. Web gọi API qua `API_INTERNAL_URL` trong `apps/web/.env.local` (mặc định `http://localhost:3001`). Tài khoản đầu tiên tạo từ `ADMIN_BOOTSTRAP_EMAIL` và `ADMIN_BOOTSTRAP_PASSWORD`.

| Biến (`apps/api/.env`) | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `DATABASE_URL` | (bắt buộc) | Địa chỉ PostgreSQL; API không khởi động nếu thiếu hoặc sai |
| `PORT` | `3001` | Cổng API |
| `NODE_ENV` | `development` | `development`, `test` hoặc `production` |
| `DATABASE_POOL_MAX` | `10` | Số kết nối tối đa |
| `RUN_MIGRATIONS_ON_START` | `false` | `true` để tự chạy migration khi khởi động |
| `SESSION_SECRET` | khóa tạm khi dev | Khóa băm mã OTP, IP, phiên; tối thiểu 32 ký tự; bắt buộc ở production. Sinh: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `MAIL_PROVIDER` | `console` | `console` (chỉ in thư ra log để dev, mã OTP hiện trong log) hoặc `brevo`; production bắt buộc `brevo` |
| `MAIL_API_KEY` | (trống) | API key Brevo, bắt buộc khi `MAIL_PROVIDER=brevo` |
| `MAIL_FROM` | (trống) | Địa chỉ người gửi đã xác minh ở Brevo, bắt buộc khi `MAIL_PROVIDER=brevo` |
| `MAIL_FROM_NAME` | `ESG Report Online` | Tên hiển thị người gửi |
| `MAIL_DAILY_LIMIT` | `300` | Hạn mức thư mỗi 24 giờ của nhà cung cấp (Brevo free: 300) |
| `TRUSTED_PROXY` | `0` | Số lớp proxy tin cậy phía trước API (Caddy: `1`); 0 là không tin tiêu đề `X-Forwarded-For` |
| `JOBS_ENABLED` | `true` | `false` để tắt việc nền (gửi lại thư, dọn dữ liệu) |
| `STORAGE_DIR` | `./storage` | Thư mục lưu tệp (logo, minh chứng, PDF/Word); production cần ổ đĩa bền vững |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Địa chỉ website, dùng dựng liên kết trong thư mời phản hồi và thư báo yêu cầu |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | (trống) | Tạo quản trị viên đầu tiên khi khởi động nếu chưa có ai; đặt cùng nhau, mật khẩu tối thiểu 12 ký tự |
| `ADMIN_NOTIFY_EMAIL` | (trống) | Nhận thư báo khi có yêu cầu tư vấn/thẩm định mới |
| `GEMINI_API_KEY` | (trống) | API key Gemini để dịch nội dung sang `en`, `fr`, `zh`; bỏ trống thì không dịch máy |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model dịch |
| `GEMINI_API_BASE_URL` | (trống) | Chỉ đặt khi gọi Gemini qua proxy |
| `TRANSLATION_DAILY_LIMIT` | `200` | Số lượt gọi Gemini tối đa mỗi 24 giờ; `0` là tắt |

Nhập bộ câu hỏi từ xlsx (kiểm tra trước, không ghi gì nếu có lỗi):

```bash
pnpm --filter api question-bank:import -- --file data/question-bank-v0.1.xlsx --dry-run
pnpm --filter api question-bank:import -- --file data/question-bank-v0.1.xlsx --version 0.1 --publish
```

`--version` bỏ trống thì lấy từ cột `content_version` (file v0.1 đang ghi `0.1-draft`). Bản đã xuất bản không bị ghi đè; muốn đổi nội dung hãy dùng số phiên bản mới. Kiểm tra: `http://localhost:3001/api/v1/survey-bank`. `apps/api` dùng `@esg/shared` qua bản build (`@esg/shared/node`); các script `build`, `start`, `start:dev`, `typecheck`, `test`, `test:integration`, `question-bank:import` tự build trước, còn chạy thẳng `vitest` hoặc `tsc` thì cần `pnpm --filter @esg/shared build` một lần.

Dùng thử đăng nhập OTP khi dev: để `MAIL_PROVIDER=console`, gọi `POST /api/v1/auth/email/request`, mã 6 số hiện trong log của API.

Kiểm thử: `pnpm --filter api test` (không cần database) và `TEST_DATABASE_URL=postgres://esg:esg@localhost:5432/postgres pnpm --filter api test:integration` (cần PostgreSQL 18, tạo và xóa database tạm). Sinh migration sau khi sửa schema: `pnpm db:generate`.

## Biến môi trường (`apps/web`)

Đặt trong `apps/web/.env.local`. Không đưa giá trị thật vào git.

| Biến | Ý nghĩa |
| --- | --- |
| `GOOGLE_SHEET_QUESTIONS_ID` | Id Google Sheet chứa bộ câu hỏi |
| `GOOGLE_APPS_SCRIPT_URL` | Địa chỉ web app Apps Script để lưu doanh nghiệp |
| `GOOGLE_APPS_SCRIPT_SECRET` | Mã bí mật, trùng với Script Properties trong Apps Script |
| `SURVEY_REVALIDATE_SECONDS` | Thời gian cache bộ câu hỏi (mặc định 300 giây) |
| `CRON_SECRET` | Khóa bí mật (từ 16 ký tự) cho endpoint tự động dịch `/api/cron/translations`, trùng `WEB_CRON_SECRET` trong Script Properties của Apps Script |
| `ENABLE_BRAND_THEME` | `true` để bật phân tích bộ nhận diện thương hiệu bằng AI (`/api/brand-theme/analyze`). Mặc định tắt, dùng chung `GEMINI_API_KEY` |
| `GEMINI_BRAND_MODEL` | Model Gemini riêng cho tính năng thương hiệu, bỏ trống thì dùng `GEMINI_MODEL` |
| `BRAND_AI_DAILY_LIMIT` | Số lần gọi AI tối đa mỗi ngày cho cả hệ thống (mặc định 30), quá mức sẽ chuyển sang lấy màu từ ảnh |
| `BRAND_AI_IP_LIMIT` | Số lần gọi AI tối đa mỗi 10 phút trên một địa chỉ IP (mặc định 5) |
| `USER_SESSION_SECRET` | Chuỗi ngẫu nhiên từ 32 ký tự để ký phiên xác nhận email (cookie `esg-user`) và mã liên kết báo cáo. Để trống thì khung nhập email OTP bị tắt, việc lưu báo cáo ẩn danh vẫn chạy. Đổi giá trị sẽ đăng xuất mọi người dùng |

Biến tùy chọn để trống được xem như chưa đặt. Hướng dẫn cài Apps Script: [docs/huong-dan-cai-dat-apps-script.md](docs/huong-dan-cai-dat-apps-script.md).

## Lệnh thường dùng

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm dev` | Chạy `apps/web` ở chế độ phát triển |
| `pnpm build` | Build `apps/web` cho production |
| `pnpm typecheck` | Kiểm tra kiểu ở mọi package |
| `pnpm lint` | Chạy ESLint ở mọi package |

Test của `@esg/shared`: chạy trong `packages/shared` bằng `tsx --test` (hoặc `pnpm --filter @esg/shared test`). Test của `apps/web`: `pnpm --filter web test`. Thử đọc ảnh thương hiệu với Gemini thật: `pnpm --filter web brand:try <thư mục ảnh>`.

## Cấu trúc thư mục

```
.
├── apps/web/src/
│   ├── app/            Route: (public) là trang khảo sát, api/company lưu doanh nghiệp
│   ├── components/     ui (thành phần cơ bản) và layout
│   ├── features/
│   │   ├── survey/     Tab ESG, câu hỏi, tiến độ, bản nháp, kế hoạch cải thiện, báo cáo PDF
│   │   ├── brand-theme/ Thẻ tải ảnh thương hiệu, xem trước và chỉnh giao diện báo cáo
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
- [Đa ngôn ngữ (vi, en, fr, zh): kiến trúc, vận hành, kiểm thử](docs/da-ngon-ngu.md)
- [Giao diện báo cáo theo thương hiệu: kiến trúc, vận hành, giới hạn](docs/thuong-hieu-bao-cao.md)
- Backend v2 (NestJS + PostgreSQL, tự host trên VPS):
  - [Tổng quan](docs/backend-spec.md)
  - [Database](docs/backend-database.md)
  - [API](docs/backend-api.md)
  - [Chuyển từ Apps Script/Sheet](docs/backend-migration.md)
  - [Triển khai và sao lưu](docs/backend-deployment.md)
  - [Lộ trình và tính năng làm sau](docs/backend-roadmap.md)
  - [Thay đổi cần chốt so với bản demo](docs/backend-quyet-dinh-can-chot.md)
- [Cài đặt Apps Script](docs/huong-dan-cai-dat-apps-script.md)
- [Trang quản trị v2](docs/huong-dan-trang-quan-tri.md)
- [Quản trị bộ câu hỏi trong Sheet](docs/huong-dan-quan-tri-bo-cau-hoi.md)
- [Đối chiếu biến mẫu và nguồn dữ liệu](docs/doi-chieu-bien-mau-nguon-du-lieu.md)
- Cài đặt Apps Script và quản trị Sheet chỉ còn đúng với bản demo; sẽ bỏ khi chuyển sang v2.
