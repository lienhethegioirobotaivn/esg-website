# ESGstudio v2: Triển khai và sao lưu

**Làm sau cùng**, sau khi toàn bộ backend và frontend v2 hoàn tất. Tài liệu này chỉ thiết kế để các giai đoạn code không đi sai hướng; chưa cần chọn nhà cung cấp VPS lúc này.

## 1. Thành phần chạy trên VPS

| Dịch vụ | Image | Ghi chú |
| --- | --- | --- |
| `caddy` | `caddy:2` | HTTPS tự động, chuyển `/api/v1/*` thẳng về `api`, còn lại về `web` |
| `web` | build từ `apps/web` | Next.js standalone |
| `api` | build từ `apps/api` | NestJS, chạy migration lúc khởi động có khóa |
| `db` | `postgres:18` | Volume riêng, không mở cổng ra ngoài. Từ PG 18 image dùng thư mục dữ liệu theo phiên bản, nên mount volume vào `/var/lib/postgresql` (không phải `/var/lib/postgresql/data`) như `compose.dev.yaml` |
| `backup` | tiện ích `pg_dump` + công cụ đồng bộ | Chạy theo lịch, xem mục 3 |

Volume: `pgdata` (database), `files` (tệp người dùng), `backups` (bản sao tại máy). Chỉ Caddy mở cổng 80/443.

Cấu hình VPS đề xuất ban đầu: 2 vCPU, 4 GB RAM, 80 GB SSD, Ubuntu LTS. Tăng dần theo dung lượng tệp minh chứng.

## 2. Biến môi trường chính

Kiểm tra bằng schema lúc khởi động. Không có biến nào dùng chung với Apps Script cũ.

| Nhóm | Biến |
| --- | --- |
| Cơ bản (đã có từ GĐ 1) | `NODE_ENV`, `PORT` (mặc định 3001), `DATABASE_URL` (bắt buộc), `DATABASE_POOL_MAX` (mặc định 10), `RUN_MIGRATIONS_ON_START` (mặc định `false`; bật ở production để `api` tự migrate có khóa advisory) |
| Database | `DATABASE_URL` |
| Phiên (đã có từ GĐ 2) | `SESSION_SECRET` (tối thiểu 32 ký tự; băm mã OTP, IP, bắt buộc ở production), `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` (GĐ 5, đặt cùng nhau, mật khẩu tối thiểu 12 ký tự; chỉ dùng tạo quản trị đầu tiên khi bảng `admin_users` còn trống, tạo xong nên xóa mật khẩu khỏi môi trường) |
| Tệp (đã có từ GĐ 4) | `STORAGE_DIR` (mặc định `./storage`; ở production trỏ tới ổ đĩa bền vững và nằm trong kế hoạch sao lưu). Dung lượng tối đa từng loại tệp là hằng số trong mã, không có `MAX_UPLOAD_BYTES` |
| Email (đã có từ GĐ 2) | `MAIL_PROVIDER` (`console` hoặc `brevo`; production bắt buộc `brevo`), `MAIL_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`, `MAIL_DAILY_LIMIT` (mặc định 300); `ADMIN_NOTIFY_EMAIL` (GĐ 5, nhận thư báo có yêu cầu tư vấn/thẩm định mới; bỏ trống thì không gửi) |
| Dịch (đã có từ GĐ 6) | `GEMINI_API_KEY` (tùy chọn; bỏ trống thì không dịch máy, web hiện tiếng Việt hoặc bản chỉnh tay), `GEMINI_MODEL` (mặc định `gemini-3.5-flash-lite`), `TRANSLATION_DAILY_LIMIT` (mặc định 200 lượt gọi/24 giờ, mỗi lượt tối đa 40 câu; `0` là tắt), `GEMINI_API_BASE_URL` (chỉ dùng khi đi qua proxy hoặc để kiểm thử). Image `api` phải mang theo `apps/api/data/glossary.json` |
| Website | `PUBLIC_BASE_URL` (GĐ 5, mặc định `http://localhost:3000`; dùng dựng liên kết trong thư mời phản hồi và thư báo yêu cầu); `TRUSTED_PROXY` (đã có từ GĐ 2: số lớp proxy tin cậy, Caddy đặt `1`) |
| Việc nền (đã có từ GĐ 2) | `JOBS_ENABLED` (mặc định `true`) |
| `web` (từ GĐ 7) | `API_INTERNAL_URL` (mặc định `http://localhost:3001`; địa chỉ `api` mà Next.js rewrite `/api/v1/*` tới, **đọc lúc build**; trong Docker đặt `http://api:3001` khi build image). `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` không còn dùng |

Ở production để Caddy chuyển `/api/v1/*` thẳng sang `api` thay vì đi qua rewrite của `web`: nhờ vậy `TRUSTED_PROXY=1` lấy đúng IP người dùng cho giới hạn tần suất và nhật ký. Thời gian chờ của proxy cho `/api/v1/admin/*` cần ít nhất 180 giây (dịch và nhập file chạy lâu).

## 3. Sao lưu tự động

| Lớp | Cách làm | Tần suất | Lưu giữ |
| --- | --- | --- | --- |
| Database | `pg_dump` định dạng custom, nén | Hằng đêm | 14 bản hằng ngày, 8 bản hằng tuần, 6 bản hằng tháng |
| Database (tùy chọn) | Lưu WAL để khôi phục theo thời điểm | Liên tục | 7 ngày |
| Tệp người dùng | Đồng bộ thư mục `files` sang kho ngoài máy (rsync/rclone) | Hằng đêm | Tăng dần, không xóa theo sau |
| Ngoài máy | Kho lưu trữ đối tượng tương thích S3 ở nhà cung cấp khác VPS, mã hóa phía máy | Hằng đêm | Theo chính sách ở trên |

Yêu cầu bắt buộc:

- **Diễn tập khôi phục** trên máy sạch ít nhất mỗi quý, ghi lại thời gian; một bản sao lưu chưa từng khôi phục thì chưa tính là có.
- Cảnh báo (email cho quản trị) khi job sao lưu thất bại hoặc bản mới nhất quá 36 giờ.
- Nơi lưu sao lưu ngoài máy và ngân sách: bạn quyết định ở giai đoạn hạ tầng.

## 4. CI/CD

GitHub Actions: build `@esg/shared` (`pnpm --filter @esg/shared build`, các script của `apps/api` tự gọi), kiểm tra kiểu, lint, kiểm thử → build image → đẩy lên GHCR → SSH vào VPS chạy `docker compose pull && docker compose up -d`. Migration chạy bởi `api` khi khởi động; có khóa advisory để tránh hai instance chạy cùng lúc. Có bước quay lui (`docker compose` giữ tag image trước).

## 5. Tên miền, DNS, Cloudflare

- Tên miền mua ở PA Việt Nam. Có hai cách: giữ DNS ở PA Việt Nam trỏ bản ghi A về IP VPS; hoặc dùng Cloudflare.
- Cloudflare miễn phí cho nhu cầu cơ bản (DNS, proxy, chứng chỉ); đăng ký bằng email, rồi đổi nameserver của tên miền ở PA Việt Nam sang nameserver Cloudflare. Chưa chốt; quyết định ở giai đoạn hạ tầng. Thiết kế hiện tại chạy đúng cả hai cách, chỉ cần cấu hình `TRUSTED_PROXY` để lấy IP thật cho giới hạn tần suất.
- Email gửi đi cần bản ghi SPF, DKIM, DMARC cho tên miền (QĐ-14).

## 6. Danh sách kiểm tra trước cutover

1. Chạy nhập dữ liệu thử và đối chiếu (xem `backend-migration.md`).
2. Khôi phục thử từ sao lưu thành công.
3. Kiểm tra gửi/nhận OTP từ tên miền thật, không vào thư rác. Cần làm trước: xác thực tên miền ở Brevo (thêm bản ghi SPF/DKIM/DMARC do Brevo cung cấp vào DNS), tạo người gửi trên tên miền đó rồi đổi `MAIL_FROM`; trong lúc phát triển dùng người gửi đã xác minh tạm.
4. Kiểm thử tải: nhiều người cùng điền và xuất báo cáo.
5. Đã thông báo thời điểm chuyển và việc đăng nhập lại.
6. Sheet/Drive đã chuyển sang chỉ đọc và đã có bản sao nguyên trạng.
