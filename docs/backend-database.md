# ESGstudio v2: Thiết kế database

PostgreSQL 18, ORM Drizzle `0.45.4`, migration bằng `drizzle-kit 0.31.11`. Tài liệu này mô tả bảng, cột chính, ràng buộc và việc dọn dữ liệu mồ côi. Mã Drizzle đã viết ở Giai đoạn 1 (`apps/api/src/database/schema/`), migration đầu tiên là `apps/api/drizzle/0000_init.sql` (29 bảng). Khi sửa schema, sửa mã Drizzle rồi chạy `pnpm db:generate`, không sửa tay file SQL đã sinh.

Quy ước chung:

- Khóa chính `id uuid` kiểu UUIDv7, sinh ở ứng dụng (thư viện `uuid`); cột còn có giá trị mặc định `uuidv7()` của PostgreSQL 18 để công cụ nhập dữ liệu và SQL thủ công vẫn sinh đúng. Mã dễ đọc (`ESG-...`, `RX-...`, `TV-...`) là cột riêng, duy nhất.
- Mọi bảng có `created_at timestamptz not null default now()`; bảng có sửa đổi có thêm `updated_at` (ứng dụng cập nhật khi ghi, không dùng trigger).
- Giá trị trạng thái/loại lưu bằng **mã enum tiếng Anh**, kiểu `text` kèm ràng buộc `check` (đã chọn `text` + `check` thay vì enum Postgres để thêm giá trị mới chỉ cần một migration đổi `check`). Danh sách giá trị nằm ở `schema/enums.ts`. Không lưu nhãn tiếng Việt.
- Email lưu chữ thường: ứng dụng chuẩn hóa, database chặn bằng `check (email = lower(email))` (đã chọn cách này, không dùng `citext`), có chỉ mục duy nhất.
- Xóa mềm chỉ dùng ở bảng `files` (`deleted_at`) để job dọn tệp trên đĩa; các bảng khác xóa cứng.

## 1. Người dùng và xác thực

| Bảng | Cột chính | Ràng buộc / ghi chú |
| --- | --- | --- |
| `users` | `id`, `email`, `email_verified_at`, `last_login_at` | `email` duy nhất |
| `user_sessions` | `id`, `user_id`, `token_hash`, `expires_at`, `user_agent`, `ip_hash` | `token_hash` duy nhất; xóa theo `user_id` cascade; hết hạn sau 30 ngày |
| `otp_challenges` | `id`, `email`, `code_hash`, `purpose`, `expires_at`, `attempts`, `consumed_at` | Mã 6 số chỉ lưu băm; hạn 600 giây; tối đa 5 lần thử; gửi lại cách 60 giây; 3 lần/giờ/email |
| `rate_limits` | `key`, `window_start`, `hits` | Khóa chính `(key, window_start)`; thay cho `createRateWindow` trong RAM |
| `admin_users` | `id`, `email`, `name`, `password_hash`, `role`, `active`, `failed_attempts`, `locked_until` | `role` thuộc `admin`, `content`, `ops`; email duy nhất |
| `admin_sessions` | `id`, `admin_id`, `token_hash`, `expires_at` | Cascade theo `admin_id` |

## 2. Ngân hàng câu hỏi (có phiên bản)

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `question_banks` | `id`, `version`, `status` (`draft`/`published`/`archived`), `published_at`, `note` | Chỉ một bản `published` tại một thời điểm (chỉ mục duy nhất từng phần) |
| `question_groups` | `id`, `bank_id`, `code` (ví dụ `P-G01`), `title`, `position`, `track` (`profile`/`core`/`sector`) | Nhóm lưu theo từng 5 câu cho việc lưu nháp; `(bank_id, code)` duy nhất |
| `questions` | `id`, `bank_id`, `group_id`, `code` (ví dụ `P-001`, `C-001`), `source` (`PROFILE`/`COMMON`/mã ngành), `pillar` (`E`/`S`/`G`, null ở hồ sơ), `topic`, `input_type`, `unit`, `required`, `text`, `guidance`, `evidence_hint`, `improvement_hint`, `report_section`, `declaration_level`, `route` (`jsonb`), `evidence_rule` (`jsonb`, nullable), `review_status`, `review_note`, `reviewed_by`, `reviewed_on`, `rollout_status`, `position`, `source_ref` | `(bank_id, code)` duy nhất; `route` dạng `{"sector_any":[...],"capability_any":[...]}`, giá trị `{}` nghĩa là hiển thị cho mọi doanh nghiệp (cột `ALL` trong xlsx); `declaration_level` là `basic`/`extended`; `review_status` là `pending`/`changes`/`approved`/`rejected` ("Chờ duyệt"/"Cần sửa"/"Đã duyệt"/"Loại bỏ"), chỉ `approved` vào khảo sát; `rollout_status` là `not_started`/`in_progress`/`testing`/`done`, chỉ để theo dõi (bốn cột duyệt và triển khai, hai trạng thái mới thêm ở migration `0005`); `input_type` **không** ràng buộc `check`, vì bộ v0.1 còn có `CONSENT`, `PERIOD`, `SECTOR`, `SECTORS` ngoài 8 kiểu của `@esg/shared` (kiểm tra ở công cụ nhập: ngoài hồ sơ chỉ được dùng 8 kiểu của `@esg/shared`); `evidence_rule` nạp từ tab 18 (quy tắc) và tab 19 (`testCases`), chưa dùng; `pillar` và `topic` tách từ cột "Chủ đề" (`E · Quản lý` → `E`, `Quản lý`), chủ đề không có tiền tố E/S/G xếp vào `G` như bản demo (thêm ở migration `0001`) |
| `question_texts` | `question_id`, `locale`, `text`, `guidance` | Bản dịch chỉnh tay theo câu; bản tự động nằm ở `translations` |

Khi admin xuất bản một bản nháp, hệ thống kiểm tra tính hợp lệ (id không trùng, route đúng cú pháp, nhóm không rỗng) rồi chuyển bản cũ sang `archived`. Báo cáo cũ vẫn tham chiếu được đúng bản đã dùng.

## 3. Doanh nghiệp, báo cáo, bản nháp

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `companies` | `id`, `user_id` (nullable), `legal_name`, `trade_name`, `tax_code`, `legal_form`, `countries`, `primary_sector`, `secondary_sectors` (mảng), `headcount_tier`, `revenue_band`, `contact_name`, `contact_email`, `contact_phone`, `logo_file_id`, `profile` (`jsonb` cho các trường hồ sơ còn lại), `care_status` (`new`/`contacting`/`following_up`/`converted`/`closed`, mặc định `new`), `next_contact_at`, `first_contacted_at`, `care_note`, `assigned_admin_id` (nullable, đặt null khi xóa quản trị viên; thêm ở GĐ 5) | Các trường lọc/tìm kiếm là cột thật; phần còn lại vào `profile` |
| `consents` | `id`, `company_id`, `kind` (`advisory`/`verification`/`matching`/`research`), `granted`, `granted_at`, `text_version`, `form_version` | Ứng với P-017 đến P-020; lịch sử đổi ý giữ lại (mỗi lần đổi một dòng) |
| `reports` | `id`, `code` (`ESG-YYYYMMDD-XXXX`), `company_id`, `owner_user_id` (nullable), `status` (`draft`/`exported`), `bank_version_id`, `last_export_at` | `code` duy nhất; `owner_user_id` đặt qua luồng gắn email; nếu chủ khác thì báo xung đột |
| `report_exports` | `id`, `export_code` (`RX-YYYYMMDD-XXXXXX`), `report_id`, `bank_version_id`, `snapshot` (`jsonb`), `pdf_file_id`, `docx_file_id`, `locale`, `brand`, `status` (`draft`/`complete`, thêm ở migration `0002`: bản xuất này làm từ khảo sát chưa hoàn tất hay đã hoàn tất) | Giữ tối đa 5 bản mới nhất mỗi `report_id`; bản cũ hơn bị xóa kèm tệp |
| `report_drafts` | `id`, `user_id`, `report_id` (nullable), `data` (`jsonb`, định dạng nháp v2), `schema_version`, `updated_at` | Chỉ cho người dùng đã xác thực; mỗi `(user_id, report_id)` một dòng |
| ~~`upload_sessions`~~ | (không tạo) | Đã bỏ theo QĐ-12 (chốt theo đề xuất): tải báo cáo một lần qua multipart, không còn tải theo đoạn |

## 4. Tệp, minh chứng

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `files` | `id`, `storage_key`, `kind` (`logo`/`evidence`/`export_pdf`/`export_docx`/`post_image`/`post_cover`), `mime`, `size`, `sha256`, `owner_user_id`, `original_name`, `referenced_at`, `deleted_at` | `storage_key` duy nhất; tệp chưa được tham chiếu sau 24 giờ bị dọn |
| `evidence_files` | `id`, `report_id`, `question_code`, `file_id`, `uploaded_by_user_id` | `(report_id, question_code, file_id)` duy nhất; tối đa số tệp theo QĐ-01; chỉ người dùng đã xác thực |
| `evidence_reviews` | (dự trữ, **chưa tạo**, kiểm thử bảo đảm không có trong migration) | Dành cho AI sau này, xem `backend-roadmap.md` |

## 5. CRM, phản hồi, nội dung

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `inquiries` | `id`, `code` (`TV-...`/`KD-...`), `kind` (`consulting`/`verification`), `status`, `priority`, `source` (mặc định `website`), `form_version`, `company_id` (nullable), `company_name`, `headcount_tier`, `sector`, `contact_phone`, `contact_email`, `message`, `contact_consent`, `contact_consent_at`, `assigned_admin_id`, `first_contacted_at`, `follow_up_at`, `outcome` | Đã chốt ở Giai đoạn 1 theo các cột và danh sách chọn của Sheet "Đăng ký Tư vấn & Kiểm định". `status` (9 giá trị): `new` (Mới tiếp nhận), `contacting` (Đang liên hệ), `awaiting_customer` (Chờ khách phản hồi), `scheduled` (Đã hẹn tư vấn), `quoted` (Đã gửi báo giá), `in_progress` (Đang thực hiện), `done` (Hoàn tất), `declined` (Không tiếp tục), `invalid` (Trùng / không hợp lệ). `priority`: `normal` (Bình thường), `high` (Cao), `urgent` (Khẩn). `contact_consent`: `yes`/`no`/`unconfirmed` (Có/Không/Chưa xác nhận). Cột `contact jsonb` trong bản thiết kế đầu được thay bằng các cột riêng để lọc và xuất file theo cột Sheet (QĐ-18). Nhãn tiếng Việt ánh xạ ở giao diện |
| `inquiry_notes` | `id`, `inquiry_id`, `admin_id`, `body` | Ghi chú nội bộ của người xử lý |
| `feedbacks` | `id`, `code` (`FB-...`), `kind` (`direct`/`invite`), `email`, `source`, `report_id`, `export_id`, `token_hash`, `invite_sent_at`, `submitted_at`, `rating`, `comment`, `form_version` | Thư mời gửi sau 5 ngày (job `send-feedback-invites`); token một lần cho liên kết đánh giá; chỉ mục duy nhất từng phần cho phép đúng một thư mời cho mỗi báo cáo |
| `posts` | `id`, `slug`, `locale` (mặc định `vi`), `section` (`thanh-tuu`/`tin-tuc`), `category`, `author_name`, `read_minutes` (1–120), `featured`, `popular`, `spotlight`, `like_base`, `legacy_code`, `title`, `excerpt`, `body` (`jsonb` ProseMirror), `cover_file_id`, `cover_url`, `status` (`draft`/`published`), `published_at`, `author_admin_id` | `slug` duy nhất theo `(locale, section)`; `legacy_code` duy nhất, giữ mã bài cũ để nhập dữ liệu; `like_base` là số lượt thích cũ; ảnh bìa trong hệ thống nằm ở `cover_file_id`, ảnh bìa ngoài ở `cover_url`; chỉ nhập bài tiếng Việt, ngôn ngữ khác lấy từ `translations` (cột mới thêm ở migration `0004`) |
| `post_files` | `post_id`, `file_id` | Cho biết ảnh nào đang được bài dùng, phục vụ dọn ảnh không còn dùng |
| `post_likes` | `post_id`, `voter_key_hash`, `created_at` | Khóa chính `(post_id, voter_key_hash)`; `voter_key_hash` là HMAC của mã trong cookie `esg-viewer`; xóa theo bài; xem QĐ-06 |
| `site_stats` | `key`, `value` (`jsonb`), `updated_at` | Số liệu trang chủ do admin nhập; khóa `achievements` |
| `translations` | `source_hash`, `locale` (`en`/`fr`/`zh`), `source_text`, `auto_text`, `manual_text`, `failed_attempts`, `retry_after`, `updated_at` | Khóa chính `(source_hash, locale)`; `source_hash` là 16 ký tự đầu của sha256 trên văn bản NFC như hiện tại, để dữ liệu cũ nhập vào nguyên vẹn; thứ tự ưu tiên: `manual_text` > bảng thuật ngữ `apps/api/data/glossary.json` (`exact`) > `auto_text` > tiếng Việt; `failed_attempts` và `retry_after` giãn cách các lần thử lại khi bản máy trả về không hợp lệ (1, 6, 24, 72 giờ, sau 5 lần thì dừng tới khi bấm thử lại) |

## 6. Hệ thống

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `email_outbox` | `id`, `to_email`, `template`, `payload` (`jsonb`), `status` (`pending`/`sent`/`failed`), `attempts`, `next_attempt_at`, `sent_at`, `error` | Thử lại có giãn cách; OTP không ghi mã rõ vào `payload` ngoài thời gian cần gửi |
| `audit_logs` | `id`, `actor_type`, `actor_id`, `action`, `entity`, `entity_id`, `meta` (`jsonb`), `ip_hash` | Ghi mọi thao tác quản trị đổi dữ liệu và xuất file CRM |
| `job_runs` | `id`, `job`, `started_at`, `finished_at`, `status`, `detail` | Theo dõi việc nền, kèm advisory lock |
| `settings` | `key`, `value` (`jsonb`) | Cấu hình sửa được từ admin (đã làm GĐ 7): `feedback.invite_delay_days` (1–29), `inquiry.notify_email`; không có dòng thì dùng mặc định (5 ngày, `ADMIN_NOTIFY_EMAIL`) |

## 7. Chỉ mục quan trọng

- `users(email)`, `reports(code)`, `report_exports(export_code)`, `inquiries(code)`, `files(storage_key)`: duy nhất.
- `reports(owner_user_id, updated_at desc)` cho "Báo cáo của tôi".
- `report_exports(report_id, created_at desc)` cho việc giữ 5 bản.
- `inquiries(status, created_at desc)`, `inquiries(kind, created_at desc)` cho CRM.
- `otp_challenges(email, created_at desc)`, `rate_limits(window_start)` cho dọn dẹp và kiểm tra tần suất.
- `questions(bank_id, group_id, position)`.

## 8. Dọn dữ liệu mồ côi (job nền)

| Dữ liệu | Điều kiện dọn | Tần suất |
| --- | --- | --- |
| `otp_challenges` | Đã hết hạn hoặc đã dùng quá 1 ngày | Hằng giờ (đã làm GĐ 2) |
| `user_sessions`, `admin_sessions` | Hết hạn | Hằng giờ (đã làm GĐ 2) |
| `rate_limits` | `window_start` cũ hơn 2 ngày | Hằng ngày (đã làm GĐ 2) |
| `files` chưa tham chiếu | `referenced_at` rỗng sau 24 giờ → xóa mềm, 7 ngày sau xóa tệp trên đĩa rồi xóa dòng | Hằng giờ (đã làm GĐ 4, `cleanup-orphan-files`) |
| `report_exports` thừa | Vượt 5 bản mỗi báo cáo → xóa dòng và đánh dấu xóa tệp PDF/Word | Ngay khi lưu bản mới, cùng giao dịch (đã làm GĐ 4) |
| `report_exports` chưa gắn email | Báo cáo chưa có chủ, bản xuất quá 24 giờ (QĐ-02); báo cáo ẩn danh không có bản xuất quá 7 ngày | Hằng giờ (đã làm GĐ 4, `cleanup-unattached-exports`) |
| `files` ảnh bài viết | Gỡ ảnh khỏi bài hoặc xóa bài: đánh dấu xóa ngay trong cùng giao dịch nếu không bài nào khác dùng (khôi phục được nếu gắn lại trong 6 ngày). Việc `cleanup-post-images` quét sót: ảnh từng được dùng, không còn trong `post_files` (thay `trashUnusedImages_`). Ảnh tải lên mà chưa bài nào dùng thuộc dòng `files` chưa tham chiếu | Ngay khi sửa/xóa bài và hằng ngày (đã làm GĐ 6) |
| `post_likes` | Bài bị xóa → xóa theo | Cascade (đã làm GĐ 6) |
| `translations` | Không có `manual_text`, câu nguồn không còn trong bộ câu hỏi đang xuất bản, bài viết (kể cả nháp) hay số liệu. Việc nền chỉ xóa dòng không đổi trong 24 giờ, nút dọn trong quản trị xóa ngay. Chưa có bộ câu hỏi xuất bản thì không xóa gì. Bản chỉnh tay luôn được giữ | Hằng ngày, hoặc bấm dọn trong quản trị (đã làm GĐ 6, `prune-translations`) |
| `evidence_files` | Báo cáo bị xóa → xóa theo, `files` tương ứng thành mồ côi | Cascade, rồi job tệp |
| `email_outbox` | `sent` quá 30 ngày (thư `failed` được giữ để quản trị xem) | Hằng tuần (đã làm GĐ 2) |
| Bản nháp | Người dùng xóa báo cáo → xóa nháp; nháp quá 12 tháng không cập nhật (QĐ-13) | Hằng ngày (đã làm GĐ 4, `cleanup-stale-drafts`) |

### 8.1 Cơ chế việc nền (đã làm ở GĐ 2)

- `JobScheduler` chạy trong tiến trình `api` (tắt bằng `JOBS_ENABLED=false`). Mỗi lần chạy một việc, `api` giữ khóa advisory `job:<tên>` nên chạy nhiều bản `api` cũng không chạy trùng; việc có `track` ghi `job_runs` (running, succeeded, failed, kèm `detail`).
- Các việc: `deliver-outbox` (30 giây, không ghi `job_runs`), `cleanup-otp-challenges` và `cleanup-sessions` (1 giờ), `cleanup-rate-limits` (1 ngày), `cleanup-sent-emails` (7 ngày); từ GĐ 4 thêm các việc dọn dẹp tệp, bản xuất và nháp, từ GĐ 5 thêm `send-feedback-invites` (1 giờ), từ GĐ 6 thêm `cleanup-post-images` (1 ngày), `translate-content` (15 phút, mỗi lượt tối đa khoảng 60 giây) và `prune-translations` (1 ngày). Tổng cộng 12 việc, mỗi việc chạy lần đầu sau 10 giây tới 9 phút kể từ lúc khởi động.
- `translate-content` và dọn bản dịch dùng chung khóa advisory `translation:run`, nên việc nền và nút bấm trong quản trị không chạy chồng nhau.
- Hộp thư đi: thư được ghi vào `email_outbox` rồi gửi ngay; việc `deliver-outbox` gửi lại thư còn `pending` đến hạn. Mỗi lần lấy thư, `attempts` tăng và `next_attempt_at` lùi 120 giây (thuê tạm) để hai tiến trình không gửi trùng. Thử lại sau 30 giây, 2 phút, 10 phút, 1 giờ; quá số lần của mẫu thư hoặc gặp lỗi không thử lại được (ví dụ sai khóa API) thì `failed`. Mẫu `otp` chỉ thử một lần (mã quá hạn nhanh) và xóa mã khỏi `payload` sau khi gửi xong hoặc thất bại.
- Hạn mức thư: đếm thư `sent` trong 24 giờ gần nhất so với `MAIL_DAILY_LIMIT`. Hết hạn mức thì không tạo thêm OTP (`503 mail_daily_limit`); thư không phải OTP chỉ được gửi khi còn lại nhiều hơn 20% hạn mức dành cho OTP.

Kiểm tra hai chiều chạy khi quản trị viên mở mục **Trạng thái và cài đặt** (đã làm GĐ 7, không phải việc nền): dòng `files` mà tệp đã mất được liệt kê; tệp trên đĩa không có dòng trong `files` không tự xóa, quản trị viên bấm xóa các tệp cũ hơn 24 giờ. Chỉ xét tên tệp đúng dạng `năm/tháng/uuid` trong `STORAGE_DIR`.

Bản ngân hàng câu hỏi nháp xóa được từ trang quản trị (nhóm, câu, bản dịch riêng xóa theo); bản đã xuất bản hoặc lưu trữ được giữ.

## 9. Quy tắc xóa khóa ngoại (đã cài ở Giai đoạn 1)

| Quan hệ | Khi xóa bản ghi cha |
| --- | --- |
| `user_sessions`, `report_drafts` → `users` | Xóa theo (cascade) |
| `admin_sessions` → `admin_users` | Xóa theo |
| `companies.user_id`, `reports.owner_user_id`, `files.owner_user_id`, `evidence_files.uploaded_by_user_id` → `users` | Đặt null; dữ liệu doanh nghiệp, báo cáo, tệp vẫn còn |
| `inquiries.assigned_admin_id`, `inquiry_notes.admin_id`, `posts.author_admin_id` → `admin_users` | Đặt null |
| `reports.company_id` → `companies` | Chặn xóa; xóa báo cáo không xóa hồ sơ doanh nghiệp (dữ liệu CRM) |
| `report_exports`, `evidence_files`, `report_drafts` → `reports` | Xóa theo; tệp trong `files` thành mồ côi và do job dọn |
| `reports.bank_version_id`, `report_exports.bank_version_id` → `question_banks` | Chặn xóa: không xóa được bản ngân hàng câu hỏi đã có báo cáo dùng |
| `consents` → `companies` | Xóa theo |
| `inquiries.company_id`, `feedbacks.report_id`, `feedbacks.export_id` → bảng cha | Đặt null; giữ yêu cầu tư vấn và đánh giá |
| `companies.logo_file_id`, `posts.cover_file_id`, `report_exports.pdf_file_id`, `report_exports.docx_file_id` → `files` | Đặt null |
| `evidence_files.file_id`, `post_files.file_id` → `files` | Xóa theo |
| `question_groups`, `questions`, `question_texts` → ngân hàng câu hỏi/nhóm/câu | Xóa theo |
