# ESGstudio v2: Chuyển từ Apps Script/Google Sheet sang NestJS/PostgreSQL

Mục tiêu: thay toàn bộ hành vi của `docs/apps-script/Code.gs` bằng module NestJS, và chuyển **toàn bộ** dữ liệu Sheet/Drive sang database và ổ đĩa VPS, không mất dữ liệu nào.

## 1. Ánh xạ action Apps Script sang module mới

| Action Apps Script | Module / endpoint mới | Khác biệt cần lưu ý |
| --- | --- | --- |
| `saveCompany` (upsert theo mã `ESG-YYYYMMDD-XXXX`, logo lên Drive) | `companies`: `POST /companies` | Logo vào `files`; thiếu trường bị từ chối thay vì bỏ qua âm thầm |
| `saveInquiry` (+ MailApp báo admin) | `inquiries`: `POST /inquiries` + `mail` | Mã `TV-`/`KD-`; email qua `email_outbox` |
| `saveFeedback`, trigger `sendFeedbackInvites` sau 5 ngày | `feedback` + job `feedback-invites` | Token một lần trong liên kết |
| `listPosts`, `savePost`, `deletePost` (nội dung chia đoạn 40.000 ký tự) | `posts` | Một cột `jsonb` |
| `likePost` (±1, không chống trùng) | `post_likes` | QĐ-06 |
| `listStats`, `saveStats` | `site_stats` | |
| `uploadImage`, `trashUnusedImages_` | `files` + `post_files` + job dọn | URL ảnh đổi (QĐ-11) |
| `translate`, `listTranslations`, `saveTranslations`, `pruneTranslations` + trigger | `translation` + job | Công cụ dịch đổi (QĐ-08) |
| `uploadReportChunk`, `finishReport` (đoạn 2.499.999 byte, tối đa 12 đoạn, 25 MB/tệp, snapshot ≤ 600.000 ký tự, giữ 5 bản, `attachToken` HMAC 6 giờ) | `reports` | Giữ 5 bản và 25 MB; bỏ trần snapshot; đoạn có thể bỏ (QĐ-12) |
| `otpRequest`, `otpVerify` | `auth` | Lưu PostgreSQL, quy tắc giữ nguyên (6 số, 600 giây, 5 lần thử, 60 giây, 3/giờ/email) |
| `setReportOwner` | `reports`: `POST /reports/attach` | Xung đột chủ giữ `409` |
| `listOwnerReports`, `getOwnerReportFile`, `getOwnerSnapshot`, `deleteOwnerReport` | `reports`: `/my-reports*` | |
| Trigger dọn đoạn tạm > 24 giờ, dòng snapshot mồ côi | `jobs` | Mở rộng ở `backend-database.md`, mục 8 |
| `CacheService` làm bộ nhớ OTP | Bảng `otp_challenges` | Không còn mất mã khi cache bị xóa |
| Mật khẩu quản trị chung + cookie `esg-admin` | `admin-auth` | QĐ-05 |
| Bộ câu hỏi đọc qua gviz CSV, cache 300 giây | `question-bank` | QĐ-10 |

Các quy tắc đã đúc kết trong `ke-hoach-luu-bao-cao-va-xac-thuc-email.md` được gộp vào tài liệu này và `backend-api.md`; file kế hoạch cũ bị xóa.

## 2. Dữ liệu cần chuyển

| Nguồn | Đích | Cách chuyển |
| --- | --- | --- |
| Sheet "Data khách hàng" (hồ sơ doanh nghiệp + đồng ý) | `companies`, `consents`, `reports` | Đọc theo tên cột, ánh xạ sang cột mới; đồng ý dạng chữ → boolean + `granted_at` lấy từ thời điểm dòng; nhãn tiếng Việt → mã enum |
| Sheet "Đăng ký Tư vấn & Kiểm định" | `inquiries`, `inquiry_notes` | Giữ nguyên mã `TV-`/`KD-`, trạng thái, ưu tiên, ghi chú |
| Sheet đánh giá/phản hồi | `feedbacks` | |
| Sheet bản xuất báo cáo, snapshot chia ô | `report_exports` | Ghép lại các ô thành `jsonb`; kiểm tra JSON hợp lệ |
| Sheet người sở hữu báo cáo (email gắn với mã) | `users`, `reports.owner_user_id` | Tạo `users` từ email duy nhất; `email_verified_at` lấy từ thời điểm gắn |
| Sheet bài viết, thống kê | `posts`, `site_stats` | Mã bài cũ → `legacy_code`; mục, chuyên mục, tác giả, phút đọc, cờ nổi bật → cột tương ứng; ngày đăng `YYYY-MM-DD` hiểu theo giờ Việt Nam; số lượt thích cũ → `like_base`; ảnh bìa ngoài → `cover_url`; nội dung dạng khối cũ chuyển sang ProseMirror bằng `sanitizeRichDoc`; thống kê lưu ở khóa `achievements` |
| Tab "Bản dịch" (khóa băm) | `translations` | Giữ nguyên `source_hash`, cột chỉnh tay → `manual_text` |
| Bộ câu hỏi v0.1 (xlsx, 175 câu, 173 "Đã duyệt") | `question_banks` (bản v0.1 `published`), `question_groups`, `questions` | Công cụ nhập đọc đúng cấu trúc xlsx, gồm cột `route` và các quy tắc minh chứng (tab 18/19) |
| Tệp trên Drive: logo, PDF/Word báo cáo, ảnh bài viết | Ổ đĩa VPS + `files` | Tải về, tính sha256, lưu `storage_key` |

## 3. Quy trình nhập

1. **Xuất nguyên trạng**: tải bản sao toàn bộ Sheet (xlsx) và thư mục Drive về lưu cất riêng làm bản gốc bất biến.
2. **Công cụ nhập** (`tools/migrate-from-sheet`): chạy được nhiều lần (idempotent theo mã báo cáo, mã inquiry, hash bản dịch).
3. **Chạy khô** (dry-run): in ra báo cáo đếm dòng nguồn so với dòng đích, danh sách dòng bị bỏ qua và lý do (email sai định dạng, JSON hỏng, tệp Drive mất).
4. **Chạy thật** vào database thử, so sánh số liệu: số công ty, số inquiry, số bản xuất, số tệp, tổng dung lượng, kiểm tra sha256 mẫu.
5. **Viết lại URL ảnh** trong nội dung bài viết và ảnh bìa từ Drive sang `/api/v1/files/:id` (QĐ-11): tạo dòng `files` loại `post_image`, ghi `post_files` và `referenced_at`, nếu không việc dọn tệp sẽ coi ảnh là mồ côi.
6. **Chạy cuối lúc cutover**: đóng băng Sheet (chỉ đọc), chạy nhập lần cuối để lấy dữ liệu phát sinh, rồi mở bản v2.
7. Dòng bị bỏ qua không bị xóa: xuất ra file `migration-rejects.xlsx` để xử lý tay.

Từ GĐ 7 trang quản trị v2 ghi thẳng vào PostgreSQL trong khi website demo vẫn dùng Sheet. Cho tới cutover, nội dung thật chỉ sửa ở phía demo; dữ liệu nhập ở trang quản trị v2 coi là dữ liệu thử. Riêng bộ câu hỏi: lúc cutover tải Sheet mới nhất dạng xlsx, nhập ở **Bộ câu hỏi → Nhập từ Excel** thành phiên bản mới rồi xuất bản.

## 4. Rủi ro và cách giảm

| Rủi ro | Giảm thiểu |
| --- | --- |
| Tệp Drive bị mất/đổi quyền, không tải được | Chạy khô sớm để biết trước; báo cáo liệt kê từng tệp |
| Tên cột trên Sheet đã bị sửa tay nên khác kỳ vọng | Công cụ in cảnh báo cột lạ/thiếu thay vì bỏ qua |
| Snapshot hỏng do ghép ô | Kiểm tra JSON; nếu hỏng, giữ bản gốc ở `raw_import` để cứu |
| Người dùng cũ phải xác thực lại | Phiên cũ không dùng được (QĐ-17); thông báo trước khi cutover |
| Đang có người điền dở trên bản demo lúc cutover | Báo trước thời điểm chuyển; nháp trong trình duyệt vẫn đọc được vì giữ định dạng nháp v2 |

## 5. Sau cutover

- Giữ Sheet và Drive ở chế độ chỉ đọc tối thiểu 90 ngày làm đường lui, rồi mới lưu trữ/xóa theo quyết định của bạn.
- Xóa `docs/apps-script/`, `huong-dan-cai-dat-apps-script.md` và các biến môi trường Apps Script sau khi hết thời gian đường lui.
