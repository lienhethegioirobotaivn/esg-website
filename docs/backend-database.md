# ESGstudio v2: Thiết kế database

PostgreSQL 18, ORM Drizzle `0.45.x`, migration bằng `drizzle-kit`. Tài liệu này mô tả bảng, cột chính, ràng buộc và việc dọn dữ liệu mồ côi. Mã Drizzle sẽ viết ở Giai đoạn 1, bám sát bảng dưới đây.

Quy ước chung:

- Khóa chính `id uuid` kiểu UUIDv7, sinh ở ứng dụng. Mã dễ đọc (`ESG-...`, `RX-...`, `TV-...`) là cột riêng, duy nhất.
- Mọi bảng có `created_at timestamptz not null default now()`; bảng có sửa đổi có thêm `updated_at`.
- Giá trị trạng thái/loại lưu bằng **mã enum tiếng Anh** (kiểu `text` kèm ràng buộc `check`, hoặc enum Postgres), không lưu nhãn tiếng Việt.
- Email lưu chữ thường, dùng kiểu `citext` hoặc chuẩn hóa ở ứng dụng, có chỉ mục duy nhất.
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
| `question_groups` | `id`, `bank_id`, `code` (ví dụ `P-G01`), `title`, `position`, `track` (`profile`/`core`/...) | Nhóm lưu theo từng 5 câu cho việc lưu nháp |
| `questions` | `id`, `bank_id`, `group_id`, `code` (ví dụ `P-001`, `C-001`), `topic`, `input_type`, `text`, `guidance`, `evidence_hint`, `declaration_level`, `route` (`jsonb`), `evidence_rule` (`jsonb`, nullable), `review_status`, `position`, `source_ref` | `(bank_id, code)` duy nhất; `route` dạng `{"sector_any":[...],"capability_any":[...]}`; `evidence_rule` nạp từ tab 18/19, chưa dùng |
| `question_texts` | `question_id`, `locale`, `text`, `guidance` | Bản dịch chỉnh tay theo câu; bản tự động nằm ở `translations` |

Khi admin xuất bản một bản nháp, hệ thống kiểm tra tính hợp lệ (id không trùng, route đúng cú pháp, nhóm không rỗng) rồi chuyển bản cũ sang `archived`. Báo cáo cũ vẫn tham chiếu được đúng bản đã dùng.

## 3. Doanh nghiệp, báo cáo, bản nháp

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `companies` | `id`, `user_id` (nullable), `legal_name`, `trade_name`, `tax_code`, `legal_form`, `countries`, `primary_sector`, `secondary_sectors` (mảng), `headcount_tier`, `revenue_band`, `contact_name`, `contact_email`, `contact_phone`, `logo_file_id`, `profile` (`jsonb` cho các trường hồ sơ còn lại) | Các trường lọc/tìm kiếm là cột thật; phần còn lại vào `profile` |
| `consents` | `id`, `company_id`, `kind` (`advisory`/`verification`/`matching`/`research`), `granted`, `granted_at`, `text_version`, `form_version` | Ứng với P-017 đến P-020; lịch sử đổi ý giữ lại (mỗi lần đổi một dòng) |
| `reports` | `id`, `code` (`ESG-YYYYMMDD-XXXX`), `company_id`, `owner_user_id` (nullable), `status` (`draft`/`exported`), `bank_version_id`, `last_export_at` | `code` duy nhất; `owner_user_id` đặt qua luồng gắn email; nếu chủ khác thì báo xung đột |
| `report_exports` | `id`, `export_code` (`RX-YYYYMMDD-XXXXXX`), `report_id`, `bank_version_id`, `snapshot` (`jsonb`), `pdf_file_id`, `docx_file_id`, `locale`, `brand` | Giữ tối đa 5 bản mới nhất mỗi `report_id`; bản cũ hơn bị xóa kèm tệp |
| `report_drafts` | `id`, `user_id`, `report_id` (nullable), `data` (`jsonb`, định dạng nháp v2), `schema_version`, `updated_at` | Chỉ cho người dùng đã xác thực; mỗi `(user_id, report_id)` một dòng |
| `upload_sessions` | `id`, `kind`, `expected_chunks`, `received_chunks`, `owner_token_hash`, `expires_at` | Thay cơ chế đoạn tải 2.499.999 byte của Apps Script nếu giữ tải theo đoạn; xem QĐ-12 |

## 4. Tệp, minh chứng

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `files` | `id`, `storage_key`, `kind` (`logo`/`evidence`/`export_pdf`/`export_docx`/`post_image`/`post_cover`), `mime`, `size`, `sha256`, `owner_user_id`, `original_name`, `referenced_at`, `deleted_at` | `storage_key` duy nhất; tệp chưa được tham chiếu sau 24 giờ bị dọn |
| `evidence_files` | `id`, `report_id`, `question_code`, `file_id`, `uploaded_by_user_id` | `(report_id, question_code, file_id)` duy nhất; tối đa số tệp theo QĐ-01; chỉ người dùng đã xác thực |
| `evidence_reviews` | (dự trữ, **chưa tạo**) | Dành cho AI sau này, xem `backend-roadmap.md` |

## 5. CRM, phản hồi, nội dung

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `inquiries` | `id`, `code` (`TV-...`/`KD-...`), `kind` (`consulting`/`verification`), `status` (`new`/`in_progress`/`done`/`closed`), `priority` (`normal`/`high`/`low`), `source` (`website`), `form_version`, `company_id` (nullable), `contact` (`jsonb`), `message`, `assigned_admin_id` | Nhãn tiếng Việt ("Mới tiếp nhận", "Bình thường") ánh xạ ở giao diện; giá trị trạng thái chính xác chốt ở Giai đoạn 1 theo cột hiện có trên Sheet |
| `inquiry_notes` | `id`, `inquiry_id`, `admin_id`, `body` | Ghi chú nội bộ của người xử lý |
| `feedbacks` | `id`, `report_id`, `export_id`, `token_hash`, `invite_sent_at`, `submitted_at`, `rating`, `comment`, `form_version` | Thư mời gửi sau 5 ngày; token một lần cho liên kết đánh giá |
| `posts` | `id`, `slug`, `locale`, `title`, `excerpt`, `body` (`jsonb` ProseMirror), `cover_file_id`, `status` (`draft`/`published`), `published_at`, `author_admin_id` | `slug` duy nhất theo `locale` |
| `post_files` | `post_id`, `file_id` | Cho biết ảnh nào đang được bài dùng, phục vụ dọn ảnh không còn dùng |
| `post_likes` | `post_id`, `voter_key_hash`, `created_at` | Khóa chính `(post_id, voter_key_hash)`; xem QĐ-06 |
| `site_stats` | `key`, `value` (`jsonb`), `updated_at` | Số liệu trang chủ do admin nhập |
| `translations` | `source_hash`, `locale`, `source_text`, `auto_text`, `manual_text`, `updated_at` | Khóa chính `(source_hash, locale)`; `source_hash` là 16 ký tự đầu của sha256 trên văn bản NFC như hiện tại, để dữ liệu cũ nhập vào nguyên vẹn; `manual_text` luôn thắng `auto_text` |

## 6. Hệ thống

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `email_outbox` | `id`, `to_email`, `template`, `payload` (`jsonb`), `status` (`pending`/`sent`/`failed`), `attempts`, `next_attempt_at`, `sent_at`, `error` | Thử lại có giãn cách; OTP không ghi mã rõ vào `payload` ngoài thời gian cần gửi |
| `audit_logs` | `id`, `actor_type`, `actor_id`, `action`, `entity`, `entity_id`, `meta` (`jsonb`), `ip_hash` | Ghi mọi thao tác quản trị đổi dữ liệu và xuất file CRM |
| `job_runs` | `id`, `job`, `started_at`, `finished_at`, `status`, `detail` | Theo dõi việc nền, kèm advisory lock |
| `settings` | `key`, `value` (`jsonb`) | Cấu hình sửa được từ admin (ví dụ số ngày mời đánh giá) |

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
| `otp_challenges` | Đã hết hạn hoặc đã dùng quá 1 ngày | Hằng giờ |
| `user_sessions`, `admin_sessions` | Hết hạn | Hằng ngày |
| `rate_limits` | `window_start` cũ hơn 2 ngày | Hằng ngày |
| `upload_sessions` và đoạn tạm | Quá 24 giờ chưa hoàn tất (như trigger hiện tại) | Hằng giờ |
| `files` chưa tham chiếu | `referenced_at` rỗng sau 24 giờ → xóa mềm, 7 ngày sau xóa tệp trên đĩa | Hằng ngày |
| `report_exports` thừa | Vượt 5 bản mỗi báo cáo → xóa dòng và tệp PDF/Word | Khi lưu bản mới, kèm quét hằng ngày |
| `files` ảnh bài viết | Không còn trong `post_files` của bài nào (thay `trashUnusedImages_`) | Hằng ngày |
| `evidence_files` | Báo cáo bị xóa → xóa theo, `files` tương ứng thành mồ côi | Cascade, rồi job tệp |
| `email_outbox` | `sent` quá 30 ngày | Hằng tuần |
| Bản nháp | Người dùng xóa báo cáo → xóa nháp; nháp quá 12 tháng không cập nhật (QĐ-13) | Hằng tuần |

Job kiểm tra thêm hai chiều: tệp trên đĩa không có dòng trong `files` (cảnh báo, không tự xóa), và dòng `files` mà tệp đã mất (ghi cảnh báo, hiện trong trang quản trị).
