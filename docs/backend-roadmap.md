# ESGstudio v2: Lộ trình, kiểm thử và tính năng làm sau

Làm theo từng giai đoạn. **Trước khi bạn ra lệnh "làm giai đoạn tiếp theo", tôi sẽ nói rõ giai đoạn đó sẽ làm gì, đầu ra là gì.** Mỗi giai đoạn kết thúc bằng: danh sách file thay đổi, cách kiểm thử, và commit message.

## 1. Các giai đoạn

| GĐ | Tên | Nội dung | Đầu ra | Kiểm thử |
| --- | --- | --- | --- | --- |
| 0 | Tài liệu (đang làm) | Viết bộ tài liệu backend v2, danh sách quyết định, xóa tài liệu lỗi thời | `docs/backend-*.md`, README, bối cảnh dự án cập nhật | Rà liên kết, tên bảng/endpoint nhất quán |
| 1 | Khung dự án và database | Dựng `apps/api` (NestJS 12), cấu hình/validate biến môi trường, Drizzle + migration cho toàn bộ bảng, Docker Compose cho dev, `/health`, CI cơ bản | `apps/api`, schema, migration đầu tiên | Migration chạy sạch từ database rỗng; kiểm thử khởi động |
| 2 | Xác thực người dùng, email, giới hạn tần suất | OTP, phiên, `MailService` + `email_outbox`, `rate-limit` trong PostgreSQL, job dọn OTP/phiên | `/auth/*` | Kiểm thử quy tắc OTP (hạn, 5 lần thử, 60 giây, 3/giờ), giới hạn theo IP |
| 3 | Ngân hàng câu hỏi | Bảng có phiên bản, công cụ nhập xlsx v0.1, API đọc, kiểm tra hợp lệ | `/survey-bank`, công cụ nhập | Nhập đủ 175 câu, `selectSurvey` cho kết quả khớp bản demo |
| 4 | Hồ sơ, báo cáo, tệp, nháp, minh chứng | `companies`, `reports`, `report_exports`, `StorageService`, `files`, gắn chủ, nháp, minh chứng, job dọn mồ côi | `/companies`, `/reports/*`, `/my-reports/*`, `/drafts/*`, `/evidence/*` | Giữ 5 bản xuất, xung đột chủ 409, tải tệp đúng chủ, dọn mồ côi |
| 5 | Quản trị: tài khoản, CRM, phản hồi | `admin-auth` có vai trò, `inquiries`, ghi chú, xuất file, `feedback` + job mời 5 ngày, `audit_logs` | `/admin/*` (CRM), `/inquiries`, `/feedback/*` | Phân quyền theo vai trò, xuất file đúng nội dung, ghi nhật ký |
| 6 | Nội dung | `posts`, ảnh, `post_likes`, `site_stats`, `translation` (Gemini) | `/posts`, `/stats`, `/translations`, `/admin/*` (nội dung) | Chống trùng lượt thích, ưu tiên bản dịch chỉnh tay, dọn ảnh |
| 7 | Giao diện trang quản trị | Làm lại hoặc cập nhật giao diện admin: câu hỏi, CRM, bài viết, bản dịch, tài khoản, trạng thái hệ thống | `apps/web` (admin) | Kiểm thử luồng chính theo vai trò |
| 8 | Chuyển frontend sang API v2 | Thay route handler gọi Apps Script bằng gọi `/api/v1`; thêm dialog nhắc xác thực email; giữ nguyên trải nghiệm điền/xuất | `apps/web` | Kiểm thử đầu-cuối: điền → xuất → xác thực → xem lại → xóa |
| 9 | Chuyển dữ liệu | `tools/migrate-from-sheet`, chạy khô và chạy thật trên bản thử, đối chiếu số liệu | Công cụ nhập, báo cáo đối chiếu | Số dòng/tệp/dung lượng khớp, mẫu sha256 |
| 10 | Hạ tầng và cutover | VPS, Docker Compose, Caddy, sao lưu và diễn tập khôi phục, CI/CD, DNS, gửi email thật, chuyển | Hệ thống production | Danh sách ở `backend-deployment.md`, mục 6 |

Thứ tự 2-6 có thể đổi nếu bạn muốn ưu tiên khác. **Giai đoạn kế tiếp sau tài liệu là GĐ 1.**

## 2. Nguyên tắc kiểm thử

- Kiểm thử đơn vị cho quy tắc nghiệp vụ (OTP, route, giữ 5 bản xuất, hợp nhất bản dịch).
- Kiểm thử tích hợp với PostgreSQL thật trong container (không giả lập database).
- Kiểm thử hợp đồng: schema `@esg/shared` là nguồn duy nhất giữa web và api.
- Mỗi giai đoạn nêu rõ lệnh chạy kiểm thử và kết quả mong đợi.

## 3. Tính năng làm sau (chưa làm, đã thiết kế chừa chỗ)

### 3.1 AI đánh giá tệp minh chứng

Trạng thái: **chưa làm**. Hiện chỉ lưu tệp minh chứng của người dùng đã xác thực email.

Dữ liệu sẵn có để mở rộng:

- Tệp minh chứng gắn `report_id` + `question_code`, kèm `sha256`, `mime`, `size`.
- Quy tắc minh chứng theo từng câu (tab 18) và ca kiểm thử AI (tab 19) của bộ câu hỏi đã nhập vào `questions.evidence_rule`, chưa được dùng.
- Sự kiện nội bộ `evidence.uploaded`, chưa có bên nghe.

Khi làm sẽ gồm:

1. Bảng `evidence_reviews`: kết quả, mô hình, phiên bản prompt, độ tin cậy, lý do, trạng thái duyệt của người, thời điểm.
2. Worker nghe `evidence.uploaded`, đọc tệp (PDF/ảnh), áp quy tắc câu hỏi, gọi Gemini, ghi kết quả.
3. Hàng đợi duyệt trong trang quản trị: AI chỉ **gợi ý**, người quyết định; chưa tự động thay đổi câu trả lời hoặc điểm.
4. Dùng ca kiểm thử tab 19 làm bộ đánh giá chất lượng trước khi bật.
5. Quyết định cần chốt lúc đó: gửi nội dung tệp tới dịch vụ AI bên ngoài có cần đồng ý riêng không (quyền riêng tư, P-020), và chi phí.

### 3.2 Quét virus tệp tải lên

ClamAV chạy cạnh `api`; tệp ở trạng thái `pending_scan` cho tới khi quét xong. Chưa làm vì tệp chỉ được người dùng đã xác thực tải lên và chỉ chủ sở hữu tải lại; nên làm trước khi mở rộng AI/chia sẻ tệp.

### 3.3 Chấm điểm

Chưa có logic chấm điểm trong bản demo. Nếu cần, thêm sau khi bộ quy tắc điểm được chốt; schema hiện tại không cản.

### 3.4 Khác

- Xóa tài khoản và xóa toàn bộ dữ liệu theo yêu cầu người dùng (hiện chỉ xóa từng báo cáo).
- Xác thực hai bước cho tài khoản quản trị.
- Nâng Drizzle lên 1.0 khi ổn định.
- Bình luận bài viết (chưa có trong bản demo).
