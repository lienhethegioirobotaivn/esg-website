# ESGstudio v2: Tài liệu tổng quan Backend

Tài liệu này thay thế hoàn toàn bản `backend-spec.md` cũ (thời Express + Google Sheet). Nó mô tả bản **production v2**: viết lại backend bằng NestJS, tự host PostgreSQL, bỏ Google Sheet, Apps Script và Vercel. Giai đoạn 1 đến 6 (khung và database, đăng nhập OTP, ngân hàng câu hỏi, báo cáo và tệp, quản trị và CRM, nội dung và dịch; 23–26/11/2026) đã code; các giai đoạn còn lại vẫn là thiết kế, xem trạng thái ở `backend-roadmap.md`.

Bộ tài liệu backend v2 gồm:

| File | Nội dung |
| --- | --- |
| `backend-spec.md` | Tổng quan, kiến trúc, nguyên tắc, module (file này) |
| `backend-database.md` | Từng bảng PostgreSQL, ràng buộc, chỉ mục, dọn dữ liệu mồ côi |
| `backend-api.md` | Hợp đồng API, quy tắc xác thực, giới hạn tần suất |
| `backend-migration.md` | Ánh xạ từng action Apps Script sang module mới, kế hoạch chuyển toàn bộ dữ liệu Sheet/Drive |
| `backend-deployment.md` | Docker, VPS, sao lưu, CI/CD (làm sau cùng) |
| `backend-roadmap.md` | Các giai đoạn, đầu ra, kiểm thử, và các tính năng làm sau (AI đánh giá minh chứng...) |
| `backend-quyet-dinh-can-chot.md` | Danh sách thay đổi ảnh hưởng tính năng/trải nghiệm so với bản demo, cần bạn quyết định |

## 1. Phạm vi và các quyết định đã chốt

- Frontend (Next.js), backend (NestJS), PostgreSQL cùng chạy trên **một VPS**, triển khai **một lần** khi viết lại xong toàn bộ. Không chạy song song với bản demo.
- Bỏ hoàn toàn Google Sheet, Apps Script, Google Drive và Vercel. Trang quản trị tự xây (được phép làm lại giao diện).
- Chuyển **toàn bộ** dữ liệu hiện có sang database, không mất dữ liệu nào (xem `backend-migration.md`). Database có sao lưu tự động.
- Email (OTP, thông báo, mời đánh giá) qua dịch vụ SMTP/API bên ngoài, ưu tiên miễn phí.
- Tệp minh chứng chỉ lưu cho người dùng **đã xác thực email**.
- Bản nháp lưu trên server chỉ khi đã xác thực email; chưa xác thực thì giữ trong trình duyệt, kèm dialog nhắc xác thực để khỏi mất bản nháp.
- CRM (Data khách hàng, Đăng ký Tư vấn & Kiểm định) nằm hoàn toàn trong trang quản trị, có nút xuất file.
- AI đánh giá minh chứng **chưa làm**: chỉ lưu tệp, thiết kế để mở rộng dễ (mục 8 và `backend-roadmap.md`).
- Hạ tầng (VPS, nơi lưu sao lưu ngoài máy, DNS, quyết định Cloudflare) làm sau cùng. Tên miền đã mua ở PA Vietnam.

## 2. Công nghệ

Phiên bản kiểm tra lại ngày 23/11/2026 và đã khóa chính xác trong `package.json` và `pnpm-lock.yaml` ở Giai đoạn 1.

| Thành phần | Chọn | Ghi chú |
| --- | --- | --- |
| Runtime | Node.js 24 LTS (hỗ trợ đến 04/2028) | Đã chốt (QĐ-20); `engines` là `>=24 <25`. Node 26 (LTS từ 28/10/2026) có thể chuyển khi bạn muốn |
| Framework | NestJS 12 (ổn định từ 27/08/2026), khóa `12.6.0` (CLI `12.0.15`) | NestJS 11 chỉ còn vá bảo mật. Nest 12 dùng ESM (import tương đối có đuôi `.js`), Vitest, Standard Schema để validate. `apps/api` dùng TypeScript `6.0.3`: bản `latest` trên npm hiện là TypeScript 7 nhưng Nest 12 chưa dùng được với nó |
| ORM | Drizzle ORM `0.45.4` + `drizzle-kit 0.31.11` (khóa chính xác) | Drizzle 1.0 đang RC và còn thay đổi phá vỡ, nên chưa dùng. Nâng lên 1.0 khi bản stable ra, qua một giai đoạn riêng |
| Database | PostgreSQL 18 (18.7), image `postgres:18` | PG 14 hết hỗ trợ 12/11/2026. PG 19.0 đã phát hành stable ngày 19/11/2026 nhưng mới là bản `.0`; giữ PG 18 và xem xét PG 19 sau khi có vài bản vá. Dùng UUIDv7 cho khóa chính (hàm `uuidv7()` có sẵn từ PG 18) |
| Frontend | Next.js 16 + React 19 như hiện tại, chạy chế độ standalone trong Docker | Không còn route handler gọi Apps Script |
| Đóng gói | pnpm workspace: `apps/web`, `apps/api`, `packages/shared` (`@esg/shared`), `tools/esg-agents` | Giữ monorepo, dùng chung zod schema và hằng số; `apps/api` dùng `@esg/shared/node` (bản build `dist/` bằng `tsup`), `apps/web` dùng mã nguồn qua đường dẫn gốc; image `api` phải build `@esg/shared` và mang theo `packages/shared/dist` |
| Proxy | Caddy (HTTPS tự động) | Cùng origin: `/` về web, `/api/*` về api, cookie `SameSite=Lax` |
| Việc nền | `JobScheduler` tự viết (bộ hẹn giờ trong tiến trình + khóa `pg_advisory_lock`, ghi `job_runs`) | Không dùng Redis và không cần `@nestjs/schedule`; xem `backend-database.md` mục 8.1 |
| Email | Lớp `MailService` đổi được nhà cung cấp (`MailProvider`); đã làm adapter Brevo (gói miễn phí 300 thư/ngày) và `console` cho dev; Resend (100 thư/ngày) là phương án dự phòng, chưa làm adapter | Xem QĐ-07 về giới hạn OTP |
| Dịch tự động | Gemini API qua `TranslationService` | Thay `LanguageApp` của Apps Script (QĐ-08) |

## 3. Kiến trúc

```
Trình duyệt ──HTTPS──> Caddy ──/──────> web (Next.js, SSR)
                              └─/api/*─> api (NestJS)
                                          ├─ PostgreSQL 18 (volume)
                                          ├─ Thư mục tệp (volume): logo, minh chứng, PDF/Word, ảnh bài viết
                                          └─ Email API ngoài, Gemini API (tùy chọn)
```

- Next.js chỉ render giao diện; mọi dữ liệu đi qua `api`. Ngân hàng câu hỏi lấy từ database, không còn gviz CSV, không còn cache 300 giây.
- PDF (`@react-pdf/renderer`) và Word (`docx`) vẫn dựng ở trình duyệt như hiện tại; server chỉ nhận và lưu tệp (giữ nguyên để không đổi trải nghiệm xuất báo cáo).
- Giới hạn tần suất, OTP, phiên đăng nhập đều lưu trong PostgreSQL, nên chạy lại container không mất trạng thái.

## 4. Nguyên tắc thiết kế (sửa các điểm chưa chuẩn của Google Sheet)

| Điểm yếu hiện tại trên Sheet | Cách khắc phục ở v2 |
| --- | --- |
| Ghép dữ liệu theo tên cột, đổi tên cột là mất trường mà không báo lỗi | Schema cố định, migration có phiên bản, kiểu dữ liệu chặt |
| Không có bảng người dùng; email chỉ là chuỗi trong dòng báo cáo | Bảng `users` (email duy nhất, `email_verified_at`) |
| Đồng ý (consent) lưu dạng chữ | Cột boolean + thời điểm + phiên bản văn bản đồng ý, bảng `consents` |
| Giá trị lưu bằng nhãn tiếng Việt ("Mới tiếp nhận", "Tư vấn") | Mã enum ổn định; nhãn hiển thị nằm ở giao diện/i18n |
| JSON cắt thành nhiều ô 40.000 ký tự, snapshot tối đa 600.000 ký tự | Cột `jsonb`, không giới hạn nhân tạo |
| Lượt thích cộng trừ 1, không chống trùng | Bảng `post_likes` có ràng buộc duy nhất (QĐ-06) |
| OTP trong `CacheService` (có thể mất), rate limit trong RAM của từng instance | Lưu ở PostgreSQL, tồn tại qua restart |
| Ngân hàng câu hỏi không có phiên bản, sửa Sheet là đổi ngay báo cáo mới | `question_banks` có phiên bản; mỗi báo cáo ghi phiên bản đã dùng |
| Id Drive nằm trong ô, xóa/di chuyển file là hỏng | Bảng `files` (khóa lưu trữ, kích thước, sha256), có việc dọn mồ côi |
| Một mật khẩu quản trị dùng chung | Tài khoản quản trị riêng, vai trò, nhật ký thao tác (QĐ-05) |
| Không có sao lưu có kiểm soát | `pg_dump` hằng đêm, tùy chọn lưu WAL, bản sao ngoài máy (thiết kế ở `backend-deployment.md`, làm sau) |

## 5. Các module NestJS

| Module | Trách nhiệm |
| --- | --- |
| `config` | Đọc và kiểm tra biến môi trường lúc khởi động bằng zod (từ chối chạy, thoát mã 1 và nêu rõ biến lỗi) |
| `database` | Kết nối Drizzle (`pg` Pool), migration có khóa `pg_advisory_lock`, tùy chọn chạy khi khởi động (`RUN_MIGRATIONS_ON_START`), giao dịch |
| `auth` | OTP email, phiên người dùng, cookie `esg-user` |
| `admin-auth` | Đăng nhập quản trị, vai trò (`admin`, `content`, `ops`), khóa khi sai nhiều lần |
| `question-bank` | Phiên bản ngân hàng câu hỏi, nhóm, câu hỏi, route, quy tắc minh chứng; API đọc cho web, API soạn thảo cho admin |
| `companies` | Hồ sơ doanh nghiệp, upsert theo mã báo cáo, logo |
| `reports` | Mã báo cáo `ESG-YYYYMMDD-XXXX`, bản xuất `RX-YYYYMMDD-XXXXXX`, snapshot, giữ tối đa 5 bản xuất mỗi mã |
| `drafts` | Bản nháp trên server cho người dùng đã xác thực |
| `evidence` | Lưu tệp minh chứng gắn với câu hỏi/báo cáo; điểm mở rộng cho AI |
| `files` / `storage` | `StorageService` (ổ đĩa VPS), bảng `files`, kiểm tra loại/kích thước/sha256, dọn mồ côi |
| `inquiries` | Đăng ký Tư vấn và Kiểm định (mã `TV-...`, `KD-...`), trạng thái, ưu tiên, ghi chú, xuất file |
| `feedback` | Mời đánh giá sau `FEEDBACK_DELAY_DAYS` = 5 ngày, nhận đánh giá |
| `posts` | Bài viết (nội dung ProseMirror JSON), ảnh, lượt thích, thống kê trang chủ |
| `translation` | Dịch tự động, bảng bản dịch, ưu tiên chỉnh tay |
| `mail` | Gửi email theo mẫu qua hộp thư đi `email_outbox` có thử lại |
| `rate-limit` | Giới hạn tần suất lưu trong PostgreSQL |
| `audit` | Nhật ký thao tác quản trị |
| `jobs` | Lịch chạy nền: dọn tệp tạm, dọn mồ côi, gửi thư mời đánh giá, dịch, sao lưu |
| `health` | `GET /api/v1/health` cho Docker và giám sát: 200 khi database trả lời trong 3 giây, 503 khi không |

## 6. Mô hình báo cáo

Giữ nguyên mô hình dữ liệu dùng chung ở `@esg/shared` để frontend không phải đổi:

- Kiểu nhập: `PRACTICE`, `INCIDENT`, `PRESENCE`, `NUMBER`, `INTEGER`, `TEXT`, `FUEL_TABLE`, `WORKFORCE_TABLE`.
- Lựa chọn: `yes/partial/no/unknown/na` (dữ liệu: `known/unknown/na`; văn bản: `provided/unknown/na`).
- Bản nháp định dạng v2; snapshot báo cáo định dạng v1 gồm hồ sơ doanh nghiệp, câu trả lời theo id câu hỏi, kế hoạch hành động, giao diện (theme), `activeGroupId`.
- `selectSurvey` lọc theo lĩnh vực chính (`MAN/RET/SER/ICT/CON/AGR/EDU/OTH`) và nhóm nhân sự (`lt-10`, `10-49` là cơ bản; `50-199`, `200-499`, `gte-500` là mở rộng). Bộ câu hỏi v0.1 còn có route theo lĩnh vực phụ và năng lực (`sector_any`, `capability_any`), xem QĐ-04.

## 7. Bảo mật và quyền riêng tư

- Cookie phiên: `HttpOnly`, `Secure`, `SameSite=Lax`. Token phiên ngẫu nhiên dài, chỉ lưu băm trong database (khác với HMAC hiện tại, nên có thể thu hồi từng phiên).
- Mật khẩu quản trị băm argon2id. Khóa tạm sau 5 lần sai trong 15 phút (giữ như demo).
- Tệp minh chứng và báo cáo không có URL công khai; tải qua API có kiểm tra chủ sở hữu.
- Đồng ý được ghi kèm thời điểm và phiên bản văn bản. Dữ liệu nghiên cứu chỉ dùng khi có đồng ý tương ứng (P-020).
- Mọi dữ liệu có lưu trữ đều phải có đường dọn: tệp không còn được tham chiếu, OTP hết hạn, phiên hết hạn, đoạn tải lên dở, bản xuất quá 5 bản, ảnh bài viết không còn dùng (chi tiết ở `backend-database.md`, mục 5).

## 8. Điểm mở rộng cho AI đánh giá minh chứng

Chưa làm ở giai đoạn này. Để sau này thêm không phải sửa lại lõi:

1. Tệp minh chứng đã lưu theo `question_code` + `report_id`, kèm sha256, mime, kích thước.
2. Quy tắc minh chứng theo câu hỏi nằm trong ngân hàng câu hỏi (cột `evidence_rule` kiểu `jsonb`, nạp từ tab 18/19 của file câu hỏi) và được giữ nguyên khi nhập, dù chưa được dùng.
3. Tên bảng dự trữ `evidence_reviews` (chưa tạo): kết quả đánh giá, mô hình, phiên bản prompt, độ tin cậy, trạng thái duyệt của người.
4. `EvidenceModule` phát sự kiện nội bộ `evidence.uploaded`; hiện không có bên nghe. Sau này một worker đăng ký nghe là đủ.

Chi tiết nằm ở `backend-roadmap.md`, mục "Tính năng làm sau".

## 9. Giới hạn đã biết của thiết kế

- Một VPS duy nhất nghĩa là không có dự phòng; chấp nhận được với lượng người dùng doanh nghiệp ít, bù bằng sao lưu và khả năng dựng lại bằng Docker Compose.
- PDF/Word dựng ở trình duyệt nên server không kiểm tra được nội dung tệp xuất. Chỉ kiểm tra loại, kích thước, sha256.
- Quét virus (ClamAV) chưa làm; liệt kê ở tính năng làm sau.
