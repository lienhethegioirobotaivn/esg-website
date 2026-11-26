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
| `POST /inquiries` | Public | Đăng ký Tư vấn hoặc Kiểm định, tạo mã `TV-`/`KD-`, gửi email thông báo (đã làm GĐ 5) | `contact` |
| `POST /feedback` | Public | Gửi đánh giá trực tiếp, điểm 1-5 (đã làm GĐ 5) | (hiện qua Apps Script) |
| `GET /feedback/invite/:token`, `POST /feedback/invite/:token` | Public (token) | Xem và gửi đánh giá từ liên kết trong email mời, dùng một lần (đã làm GĐ 5) | (hiện qua Apps Script) |

## 5. Nội dung công khai

Đã làm ở GĐ 6. `locale` nhận `vi` (mặc định), `en`, `fr`, `zh`; giá trị khác trả 400 `invalid_locale`. Các endpoint đọc `posts`, `stats`, `translations` dùng chung giới hạn 600 lượt/phút/IP, `Cache-Control: public, max-age=60, must-revalidate`, có ETag (`If-None-Match` → 304).

| Phương thức, đường dẫn | Quyền | Mô tả | Route cũ |
| --- | --- | --- | --- |
| `GET /posts?section=&locale=&limit=&offset=` | Public | `{ posts: PostSummary[], total }`, chỉ bài đã đăng, mới nhất trước; `section` là `thanh-tuu` hoặc `tin-tuc`; `limit` 1–200 (mặc định 100) | Apps Script `listPosts` |
| `GET /posts/:section/:slug?locale=` | Public | `PostSummary` kèm `body` (ProseMirror); không có hoặc còn là nháp: 404 `post_not_found`. Thay cho `/posts/:slug` ở bản thiết kế đầu vì slug chỉ duy nhất trong từng mục | Apps Script `listPosts` |
| `POST /posts/:id/like` | Public | Trả `{ liked: true, likes }`; đặt cookie ẩn danh `esg-viewer` (httpOnly, sameSite lax, 1 năm); thích lại không cộng thêm (QĐ-06). 60 lượt/10 phút/IP và 20 lượt/ngày cho mỗi cặp IP + bài | `likes` |
| `DELETE /posts/:id/like` | Public | Bỏ thích theo cookie, trả `{ liked: false, likes }` | `likes` |
| `GET /stats?locale=` | Public | `{ items: [{ value, label }] }` | `listStats` |
| `GET /translations?locale=en` | Public | `{ locale, items: { "<mã băm>": "bản dịch" } }`, đã gộp theo thứ tự chỉnh tay > bảng thuật ngữ > máy dịch; `locale` chỉ nhận `en`, `fr`, `zh` | Apps Script `listTranslations` |
| `GET /files/:id` | Public (chỉ ảnh bài viết) | Phục vụ ảnh bài viết, `Cache-Control: public, max-age=31536000, immutable`, ETag, `nosniff`; loại tệp khác hoặc tệp đã xóa: 404 `file_not_found` | (thay URL Drive) |
| `GET /health` | Public | Kiểm tra sống và kết nối database. Trả `200 {"status":"ok","database":"up","uptimeSeconds":n}`; khi database không trả lời trong 3 giây trả `503 {"status":"error","database":"down",...}`. Đã làm ở Giai đoạn 1; đường dẫn đầy đủ `/api/v1/health` | (mới) |

`PostSummary`: `id`, `section`, `slug`, `category`, `title`, `summary`, `coverUrl` (đường dẫn `/api/v1/files/:id`, địa chỉ `https` ngoài, hoặc rỗng), `author`, `readMinutes`, `publishedAt` (`YYYY-MM-DD` theo giờ Việt Nam, như bản demo), `featured`, `popular`, `spotlight`, `status`, `likes` (số nền cũ + số lượt thích trong `post_likes`).

Với `locale` khác `vi`, `/posts` dịch tiêu đề, tóm tắt, chữ trong bài, mô tả và chú thích ảnh; `/stats` dịch nhãn; `/survey-bank` dịch toàn bộ chữ của khảo sát và câu hồ sơ (bản riêng trong `question_texts` được ưu tiên). Chuyên mục và tên tác giả giữ nguyên. Chưa có bản dịch thì trả tiếng Việt; request không bao giờ chờ gọi Gemini.

## 6. Quản trị

Tất cả dưới `/admin`, cần phiên quản trị; ghi `audit_logs`.

| Nhóm | Đường dẫn | Vai trò | Ghi chú |
| --- | --- | --- | --- |
| Phiên (đã làm GĐ 5) | `POST /admin/login`, `POST /admin/logout`, `GET /admin/me` | - | Khóa 15 phút sau 5 lần sai (như demo) |
| Tài khoản (đã làm GĐ 5) | `GET/POST/PATCH /admin/users` | `admin` | Tạo, đổi vai trò, đổi mật khẩu, vô hiệu hóa |
| Ngân hàng câu hỏi | `GET /admin/question-banks`, `POST /admin/question-banks` (nhập từ xlsx hoặc nhân bản bản đang xuất bản), `PATCH .../questions/:id`, `POST .../publish`, `POST .../validate` | `admin`, `content` | Có xem trước, kiểm tra hợp lệ trước khi xuất bản |
| CRM (đã làm GĐ 5) | `GET /admin/customers`, `GET/PATCH /admin/customers/:id` (cột chăm sóc), `GET /admin/inquiries`, `GET/PATCH /admin/inquiries/:id` (trạng thái, ưu tiên, người phụ trách, hẹn gọi lại, kết quả), `POST /admin/inquiries/:id/notes`, `GET /admin/feedback` | `admin`, `ops` | Lọc, tìm kiếm, phân trang `limit`/`offset` |
| Xuất file CRM (đã làm GĐ 5) | `GET /admin/customers/export?format=xlsx|csv`, `GET /admin/inquiries/export?...`, `GET /admin/feedback/export?...` | `admin`, `ops` | Ghi `audit_logs`; mặc định csv (có BOM), theo bộ lọc đang chọn, tối đa 10.000 dòng |
| Bài viết (đã làm GĐ 6) | `GET/POST /admin/posts`, `GET/PATCH/DELETE /admin/posts/:id`, `POST /admin/upload` (ảnh) | `admin`, `content` | Thay `admin/posts`, `admin/upload`; chi tiết ở mục 6.1 |
| Thống kê (đã làm GĐ 6) | `GET/PUT /admin/stats` | `admin`, `content` | Thay `admin/stats`; tối đa 8 số liệu |
| Bản dịch (đã làm GĐ 6) | `GET/PUT /admin/translations`, `POST /admin/translations/run` | `admin`, `content` | Thay `admin/translations`, `cron/translations`; chi tiết ở mục 6.1 |
| Hệ thống | `GET /admin/jobs`, `GET /admin/files/health`, `GET /admin/outbox` | `admin` | Theo dõi việc nền, tệp mất, thư chưa gửi |
| Cài đặt | `GET/PATCH /admin/settings` | `admin` | |

### 6.1 Chi tiết phần nội dung (GĐ 6)

| Endpoint | Yêu cầu | Thành công | Lỗi |
| --- | --- | --- | --- |
| `GET /admin/posts` | `section`, `status`, `q`, `limit`, `offset` | `{ posts (kèm updatedAt, không có body), total }` | - |
| `GET /admin/posts/:id` | - | Bài đầy đủ | 404 `post_not_found` |
| `POST /admin/posts` | `postInputSchema` của `@esg/shared`; thân tối đa 2 MB | `201`, bài vừa tạo | 400 `invalid_post` / `invalid_image` (kèm `fields`), 409 `slug_taken` (kèm `fields.slug`), 413 `payload_too_large` |
| `PATCH /admin/posts/:id` | Chỉ cần các trường muốn đổi; kết quả gộp được kiểm tra lại toàn bộ | Bài sau khi sửa | như trên, 404 `post_not_found` |
| `DELETE /admin/posts/:id` | - | `204`; xóa lượt thích, gỡ và đánh dấu xóa ảnh không bài nào còn dùng | 404 `post_not_found` |
| `POST /admin/upload` | Multipart, trường `image` (PNG/JPEG/WEBP ≤ 3 MB, kiểm tra chữ ký); 120 lượt/10 phút/người | `201 { id, url }` | 400 `invalid_file`, 413 `file_too_large` |
| `GET /admin/stats`, `PUT /admin/stats` | `{ items }` theo `statsInputSchema` | `{ items, updatedAt }` | 400 `invalid_stats` (kèm `fields`) |
| `GET /admin/translations` | `locale` (bắt buộc), `status` = `all`/`missing`/`auto`/`manual`, `q`, `limit`, `offset` | `{ items: [{ sourceHash, sourceText, autoText, manualText, glossaryText, status, failedAttempts, updatedAt }], total, configured }` | 400 `invalid_request` |
| `PUT /admin/translations` | `{ locale, items: [{ sourceHash, manualText \| null }] }`, tối đa 100 dòng; `null` là bỏ bản chỉnh tay | `{ updated }` | 404 `translation_not_found` (không lưu dòng nào) |
| `POST /admin/translations/run` | `{ locale?, retryFailed?, prune? }`; 30 lượt/10 phút/người | Chạy dịch: `{ configured, stoppedReason, requests, locales: { en: { total, translated, remaining } } }`. `prune: true` chỉ dọn: `{ removed, keptManual, skipped }` | 409 `translation_running` |

`stoppedReason`: `null` (hết việc cần làm hoặc phần còn lại đang chờ thử lại), `time_budget` (hết 40 giây của một lượt bấm, bấm tiếp để chạy phần còn lại), `daily_limit` (hết `TRANSLATION_DAILY_LIMIT`), `rate_limited` (Gemini trả 429), `error` (không gọi được Gemini; xem log API). `configured: false` nghĩa là chưa đặt `GEMINI_API_KEY`: câu nguồn vẫn được đồng bộ để chỉnh tay.

## 7. Route cũ không chuyển sang v2

| Route cũ | Xử lý |
| --- | --- |
| `/api/brand-theme/analyze` | Giữ ở frontend nếu vẫn bật; gọi API v2 `POST /brand-theme/analyze` chỉ khi tính năng được bật (hiện tắt ở production) |
| `/api/ai-data/run` | Tương tự, công cụ `/cong-cu-ai` tắt ở production; giữ ngoài phạm vi v2 |
| Route handler Next.js gọi Apps Script | Xóa toàn bộ khi cutover |

## 8. Quy tắc chung

- Idempotency: `POST /companies` theo mã báo cáo; hoàn tất tải lên theo `upload_id`.
- Phân trang `limit`/`offset` cho danh sách (CRM, bài viết, bản dịch).
- Mọi mốc thời gian trả về ISO 8601 UTC; giao diện hiển thị múi giờ `Asia/Ho_Chi_Minh`.
- Không bao giờ trả băm, token, đường dẫn tệp trên đĩa ra ngoài.
