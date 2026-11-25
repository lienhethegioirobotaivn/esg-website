# ESGstudio v2: Hợp đồng API

Tiền tố `/api/v1`, cùng origin với website (Caddy chuyển `/api/*` sang NestJS). Dữ liệu vào/ra kiểm tra bằng schema dùng chung ở `@esg/shared`. Lỗi trả về dạng `{ "error": { "code": "...", "message": "..." } }`; thông điệp hiển thị cho người dùng đi theo i18n ở frontend, `code` là mã ổn định.

Ký hiệu quyền: **Public** (không cần đăng nhập), **User** (cookie `esg-user`, đã xác thực email), **Admin** (cookie phiên quản trị; ghi rõ vai trò).

## 1. Xác thực người dùng

| Phương thức, đường dẫn | Quyền | Mô tả | Thay cho route cũ |
| --- | --- | --- | --- |
| `POST /auth/email/request` | Public | Gửi OTP 6 số tới email | `/api/auth/email/request` |
| `POST /auth/email/verify` | Public | Xác minh OTP, tạo phiên 30 ngày | `/api/auth/email/verify` |
| `GET /auth/me` | Public | Trả về người dùng hiện tại hoặc `null` | `/api/auth/me` |
| `POST /auth/logout` | User | Hủy phiên | `/api/auth/logout` |

Giới hạn (giữ như demo): yêu cầu OTP 6 lần/IP/10 phút và 300/ngày; xác minh 20 và 3.000; mỗi email 3 lần/giờ, cách nhau 60 giây; sai tối đa 5 lần mỗi mã. Hạn mức thư theo nhà cung cấp (`MAIL_DAILY_LIMIT`, Brevo free 300/24 giờ): xem QĐ-07. Đã làm ở Giai đoạn 2.

Chi tiết đã làm (Giai đoạn 2):

| Endpoint | Thân yêu cầu | Thành công | Lỗi |
| --- | --- | --- | --- |
| `POST /auth/email/request` | `{ email, locale }` (`vi`, `en`, `fr`, `zh`) | `200 { resendAfter: 60, expiresIn: 600 }` | `400 invalid_email`, `429 otp_wait` / `otp_hourly_limit` / `rate_limited` (kèm `retryAfter` và tiêu đề `Retry-After`), `502 mail_unavailable`, `503 mail_daily_limit` |
| `POST /auth/email/verify` | `{ email, code }` (6 số) | `200 { email }` + cookie `esg-user` | `400 otp_invalid` (kèm `triesLeft`), `410 otp_expired`, `429 otp_locked` / `rate_limited` |
| `GET /auth/me` | - | `200 { email: string \| null }` | - |
| `POST /auth/logout` | - | `204`, xóa cookie | `401 unauthorized` nếu chưa đăng nhập |

Email được chuẩn hóa về chữ thường. Yêu cầu mã mới làm mã cũ hết hiệu lực. Nếu gửi thư thất bại thì mã vừa tạo bị xóa và không tính vào hạn mức 3 lần/giờ.

Mã lỗi dùng chung (`error.code`): `invalid_request` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404), `method_not_allowed` (405), `payload_too_large` (413), `rate_limited` (429), `internal_error` (500, không lộ chi tiết). Thân lỗi luôn là `{ "error": { "code", "message", ...trường phụ như retryAfter, triesLeft } }`.

## 2. Ngân hàng câu hỏi và hồ sơ

| Phương thức, đường dẫn | Quyền | Mô tả |
| --- | --- | --- |
| `GET /survey-bank?locale=vi` | Public | Bộ câu hỏi bản đang xuất bản (đã làm ở GĐ 3): `{ version, locale, publishedAt, survey, profile }`; `survey` là `Survey` của `@esg/shared` chỉ gồm câu đã duyệt, `profile` là câu hồ sơ. ETag yếu + `If-None-Match` → 304; `Cache-Control: public, max-age=60, must-revalidate`; 120 lượt/phút/IP; `locale` ngoài `vi/en/fr/zh` → 400 `invalid_locale`; chưa có bản xuất bản → 404 `survey_bank_unavailable` |
| `POST /companies` | Public (phiên tùy chọn) | Đã làm ở GĐ 4. Multipart: các trường `companyProfileSchema`, `reportCode` tùy chọn, `logo` tùy chọn (PNG/JPG/WEBP ≤ 2 MB, kiểm tra chữ ký). Upsert theo mã báo cáo; trả `{ reportCode, claimToken }`. Báo cáo đã có chủ chỉ chủ mới cập nhật (403). 30 lượt/10 phút/IP |

## 3. Báo cáo, nháp, minh chứng

Đã làm ở GĐ 4. Mọi endpoint "User" dùng cookie `esg-user`; báo cáo, bản xuất, minh chứng không thuộc người gọi luôn trả 404 để không lộ sự tồn tại.

| Phương thức, đường dẫn | Quyền | Mô tả | Route cũ |
| --- | --- | --- | --- |
| `POST /reports/exports` | Public (phiên tùy chọn) | Multipart: `reportCode`, `locale`, `status` (`draft`/`complete`), `theme` (`default`/`brand`), `snapshot` (JSON ≤ 600.000 ký tự), tệp `pdf` và/hoặc `docx` (≤ 25 MB, kiểm tra chữ ký). Trả `{ exportId, reportCode, attachToken }`; `attachToken` là `null` khi người gọi đã đăng nhập hoặc báo cáo đã có chủ. Báo cáo đã có chủ khác người gọi: 403. 20 lượt/giờ/IP | `reports/upload` + `reports/finish` |
| `POST /reports/exports/:exportId/attach` | User | Body `{ attachToken }` (hợp lệ 6 giờ). Trả `{ status: "attached" \| "already" }`; chủ khác: 409 `owner_conflict`; token sai hoặc hết hạn: 403 `invalid_attach_token` | `reports/attach` |
| `POST /reports/claim` | User | Body `{ reportCode, claimToken }` (hợp lệ 24 giờ, phát từ `POST /companies`). Cùng kết quả như attach; 403 `invalid_claim_token` | (mới) |
| `GET /my-reports` | User | `{ reports: MyReport[] }` đúng `myReportListSchema` | `my-reports` |
| `GET /my-reports/:exportId/files/pdf` hoặc `docx` | User | Tải tệp (luồng, `attachment`, `private, no-store`) | `my-reports/[id]/file` |
| `GET /my-reports/:exportId/snapshot` | User | `{ snapshot, reportCode }` | `my-reports/[id]/snapshot` |
| `DELETE /my-reports/:exportId` | User | Xóa bản xuất và tệp; xóa bản cuối thì xóa cả báo cáo, minh chứng, nháp, hồ sơ | `my-reports/[id]` |
| `GET /drafts?reportCode=` | User | `{ draft: { data, schemaVersion, updatedAt } \| null }`; không có `reportCode` là nháp chung | (mới) |
| `PUT /drafts` | User | Body `{ reportCode \| null, schemaVersion: 2, data, baseUpdatedAt?, overwrite? }`; trả `{ updatedAt }`. Đã có nháp mà `baseUpdatedAt` lệch: 409 `draft_conflict` kèm `updatedAt`; gửi lại với `overwrite: true` để ghi đè. 120 lượt/phút/người | (mới) |
| `DELETE /drafts?reportCode=` | User | Xóa nháp | (mới) |
| `POST /evidence` | User, chủ báo cáo | Multipart `reportCode`, `questionCode`, `file` (PDF/PNG/JPEG/WEBP ≤ 10 MB); tối đa 10 tệp mỗi câu (409 `evidence_limit`); mã câu không có trong bộ câu hỏi của báo cáo: 400 `invalid_question`. 60 lượt/10 phút/người | (mới) |
| `GET /evidence?reportCode=` | User | `{ evidence: [{ id, questionCode, name, mime, size, createdAt }] }` | (mới) |
| `GET /evidence/:id/file` | User | Tải lại tệp minh chứng của chính mình | (mới) |
| `DELETE /evidence/:id` | User | Gỡ tệp minh chứng | (mới) |

Mã lỗi thêm ở GĐ 4: `invalid_company`, `invalid_file` (400), `file_too_large` và `payload_too_large` (413), `invalid_snapshot`, `invalid_draft`, `invalid_question` (400), `report_not_found`, `evidence_not_found`, `file_not_found` (404), `owner_conflict`, `draft_conflict`, `evidence_limit` (409), `invalid_attach_token`, `invalid_claim_token` (403).

Giới hạn tần suất của người đã đăng nhập (xem, tải, xóa, gắn): 60 lượt/phút/người; minh chứng đọc 120 lượt/phút/người.

Ghi chú QĐ-12 (đã chốt theo đề xuất, làm ở GĐ 4): một endpoint multipart duy nhất thay cho tải theo đoạn; không có bảng `upload_sessions`. Thân JSON tối đa 1 MB.

Quy tắc dữ liệu: tối đa 25 MB mỗi tệp; giữ 5 bản xuất mới nhất mỗi mã báo cáo; bản xuất chưa gắn email quá 24 giờ bị xóa (QĐ-02); nháp quá 12 tháng bị xóa (QĐ-13); nếu `reports.owner_user_id` đã khác người gọi thì trả `409 owner_conflict`.

## 4. Liên hệ và phản hồi

| Phương thức, đường dẫn | Quyền | Mô tả | Route cũ |
| --- | --- | --- | --- |
| `POST /inquiries` | Public | Đăng ký Tư vấn hoặc Kiểm định, tạo mã `TV-`/`KD-`, gửi email thông báo | `contact` |
| `POST /feedback/:token` | Public (token) | Gửi đánh giá từ liên kết trong email mời | (hiện qua Apps Script) |

## 5. Nội dung công khai

| Phương thức, đường dẫn | Quyền | Mô tả | Route cũ |
| --- | --- | --- | --- |
| `GET /posts`, `GET /posts/:slug` | Public | Bài viết đã xuất bản | Apps Script `listPosts` |
| `POST /posts/:id/like`, `DELETE /posts/:id/like` | Public | Thích/bỏ thích, chống trùng theo khóa người xem | `likes` |
| `GET /stats` | Public | Số liệu trang chủ | `listStats` |
| `GET /translations?locale=en` | Public | Bản dịch (đã gộp chỉnh tay) | Apps Script `listTranslations` |
| `GET /files/:id` | Public (chỉ ảnh bài viết) | Phục vụ ảnh bài viết với cache dài | (thay URL Drive) |
| `GET /health` | Public | Kiểm tra sống và kết nối database. Trả `200 {"status":"ok","database":"up","uptimeSeconds":n}`; khi database không trả lời trong 3 giây trả `503 {"status":"error","database":"down",...}`. Đã làm ở Giai đoạn 1; đường dẫn đầy đủ `/api/v1/health` | (mới) |

## 6. Quản trị

Tất cả dưới `/admin`, cần phiên quản trị; ghi `audit_logs`.

| Nhóm | Đường dẫn | Vai trò | Ghi chú |
| --- | --- | --- | --- |
| Phiên | `POST /admin/login`, `POST /admin/logout`, `GET /admin/me` | - | Khóa 15 phút sau 5 lần sai (như demo) |
| Tài khoản | `GET/POST/PATCH /admin/users` | `admin` | Tạo, đổi vai trò, vô hiệu hóa |
| Ngân hàng câu hỏi | `GET /admin/question-banks`, `POST /admin/question-banks` (nhập từ xlsx hoặc nhân bản bản đang xuất bản), `PATCH .../questions/:id`, `POST .../publish`, `POST .../validate` | `admin`, `content` | Có xem trước, kiểm tra hợp lệ trước khi xuất bản |
| CRM | `GET /admin/customers`, `GET /admin/customers/:id`, `GET /admin/inquiries`, `PATCH /admin/inquiries/:id` (trạng thái, ưu tiên, người phụ trách), `POST /admin/inquiries/:id/notes` | `admin`, `ops` | Lọc, tìm kiếm, phân trang |
| Xuất file CRM | `GET /admin/customers/export?format=xlsx|csv`, `GET /admin/inquiries/export?...` | `admin`, `ops` | Ghi `audit_logs`; định dạng chốt ở Giai đoạn CRM |
| Bài viết | `GET/POST/PATCH/DELETE /admin/posts`, `POST /admin/upload` (ảnh) | `admin`, `content` | Thay `admin/posts`, `admin/upload` |
| Thống kê | `GET/PUT /admin/stats` | `admin`, `content` | Thay `admin/stats` |
| Bản dịch | `GET/PUT /admin/translations`, `POST /admin/translations/run` | `admin`, `content` | Thay `admin/translations`, `cron/translations` |
| Hệ thống | `GET /admin/jobs`, `GET /admin/files/health`, `GET /admin/outbox` | `admin` | Theo dõi việc nền, tệp mất, thư chưa gửi |
| Cài đặt | `GET/PATCH /admin/settings` | `admin` | |

## 7. Route cũ không chuyển sang v2

| Route cũ | Xử lý |
| --- | --- |
| `/api/brand-theme/analyze` | Giữ ở frontend nếu vẫn bật; gọi API v2 `POST /brand-theme/analyze` chỉ khi tính năng được bật (hiện tắt ở production) |
| `/api/ai-data/run` | Tương tự, công cụ `/cong-cu-ai` tắt ở production; giữ ngoài phạm vi v2 |
| Route handler Next.js gọi Apps Script | Xóa toàn bộ khi cutover |

## 8. Quy tắc chung

- Idempotency: `POST /companies` theo mã báo cáo; hoàn tất tải lên theo `upload_id`.
- Phân trang kiểu con trỏ cho danh sách lớn (CRM, bài viết).
- Mọi mốc thời gian trả về ISO 8601 UTC; giao diện hiển thị múi giờ `Asia/Ho_Chi_Minh`.
- Không bao giờ trả băm, token, đường dẫn tệp trên đĩa ra ngoài.
