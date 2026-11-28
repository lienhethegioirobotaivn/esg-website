# Hướng dẫn dùng trang quản trị v2 (`/quan-tri`)

Áp dụng từ giai đoạn 7 (28/11/2026). Trang quản trị gọi API mới (`apps/api`) và ghi vào PostgreSQL.

> **Quan trọng, cho tới khi xong giai đoạn 8:** website công khai (bài viết, số liệu, bản dịch, bộ câu hỏi, form liên hệ) vẫn đọc và ghi Google Sheet/Apps Script. Những gì sửa ở trang quản trị v2 **chưa hiện** trên website công khai. Nội dung thật vẫn sửa theo cách cũ (xem `huong-dan-quan-tri-bo-cau-hoi.md`).

## 1. Đăng nhập và quyền

- Mở `/quan-tri`, nhập email và mật khẩu của tài khoản quản trị. Mật khẩu chung `ADMIN_PASSWORD` không còn dùng.
- Tài khoản đầu tiên tạo từ `ADMIN_BOOTSTRAP_EMAIL` và `ADMIN_BOOTSTRAP_PASSWORD` trong `apps/api/.env` (chỉ khi chưa có tài khoản nào). Các tài khoản sau tạo ở mục **Tài khoản**.
- Sai mật khẩu 5 lần thì khóa 15 phút.
- Phiên hết hạn khi đang làm: hộp **Đăng nhập lại** hiện ra, đăng nhập xong thì nội dung đang gõ vẫn còn.
- Đổi mật khẩu của mình: **Đổi mật khẩu** ở thanh bên. Các thiết bị khác bị đăng xuất.

| Vai trò | Thấy các mục |
| --- | --- |
| Quản trị viên (`admin`) | Tất cả |
| Biên tập nội dung (`content`) | Bài viết, Số liệu thành tựu, Bản dịch, Bộ câu hỏi, Giải pháp carbon |
| Vận hành (`ops`) | Yêu cầu tư vấn, Doanh nghiệp, Phản hồi, Giải pháp carbon |

Danh sách nào có bộ lọc thì bộ lọc nằm trên địa chỉ trang, có thể gửi đường dẫn cho đồng nghiệp.

## 2. Khách hàng

| Mục | Làm được gì |
| --- | --- |
| Yêu cầu tư vấn | Tìm theo mã, tên, email, điện thoại; lọc loại, trạng thái, người phụ trách. Mở một yêu cầu để đổi trạng thái, ưu tiên, người phụ trách, hẹn gọi lại, kết quả, thêm ghi chú |
| Doanh nghiệp | Tìm theo tên, mã số thuế, email, điện thoại. Mở hồ sơ để xem thông tin, báo cáo, lịch sử đồng ý; sửa trạng thái chăm sóc, người phụ trách, ngày liên hệ tiếp theo, ghi chú |
| Phản hồi | Xem đánh giá gửi trực tiếp và qua thư mời, điểm trung bình |

Nút **Xuất CSV** và **Xuất Excel** tải đúng danh sách đang lọc (tối đa 10.000 dòng). Mỗi lần xuất được ghi nhật ký.

## 3. Nội dung

### 3.1 Bài viết

- **Đăng bài mới** để soạn; **Lưu nháp** hoặc **Đăng bài**. Bài đã đăng có thể **Gỡ về nháp**.
- Đường dẫn (slug) tự tạo từ tiêu đề, sửa được; không trùng trong cùng một mục.
- Ảnh PNG, JPG, WEBP tối đa 3 MB. Gỡ ảnh khỏi bài hoặc xóa bài thì ảnh không còn dùng được dọn tự động.
- Rời trang khi chưa lưu sẽ được hỏi lại.

### 3.2 Số liệu thành tựu

Tối đa 8 số liệu, đổi thứ tự bằng nút lên, xuống. Xóa hết và lưu thì dải số liệu bị ẩn.

### 3.3 Bản dịch

- Chọn ngôn ngữ (Anh, Pháp, Trung), lọc theo tình trạng, tìm theo chữ nguồn hoặc bản dịch.
- Sửa một đoạn: bản sửa tay luôn được ưu tiên; bỏ bản sửa tay thì quay lại bản máy dịch.
- **Dịch phần còn thiếu**, **Thử lại đoạn bị lỗi**, **Dọn bản dịch không còn dùng**.
- Máy dịch cần `GEMINI_API_KEY` trong `apps/api/.env`. Không có khóa vẫn sửa tay được.

## 4. Bộ câu hỏi

### 4.1 Nguyên tắc

- Bộ câu hỏi có phiên bản: **Bản nháp** (sửa được), **Đang xuất bản** (chỉ xem, khảo sát đang dùng), **Đã lưu trữ** (chỉ xem).
- Mỗi lần chỉ một bản đang xuất bản. Báo cáo đã tạo giữ phiên bản đã dùng.
- Mọi chỉnh sửa làm trên bản nháp, khảo sát chỉ đổi khi bấm **Xuất bản**.

### 4.2 Lần đầu

Nếu danh sách phiên bản còn trống: trong Google Sheet chọn **Tệp → Tải xuống → Microsoft Excel (.xlsx)**, rồi bấm **Nhập từ Excel** → **Kiểm tra file** → **Nhập thành bản nháp** → mở bản nháp → **Kiểm tra & xuất bản**.

### 4.3 Sửa câu hỏi

1. Bấm **Sửa bộ câu hỏi**. Hệ thống mở bản nháp đang có, hoặc tạo bản nháp mới từ bản đang xem.
2. Chọn tab (Hồ sơ, Chung, 8 ngành). Có ô tìm và bộ lọc duyệt, mức khai báo, triển khai.
3. Bấm vào câu cần sửa, sửa ở khung bên phải, bấm **Lưu câu hỏi** hoặc Ctrl+S.

| Muốn làm | Cách làm |
| --- | --- |
| Thêm câu | **Thêm câu hỏi**; mã câu để trống thì tự cấp |
| Nhân bản | Mở câu → **Nhân bản** |
| Chèn đúng chỗ, đổi thứ tự | Ô **Vị trí trong tab**, hoặc nút lên, xuống trong danh sách |
| Ẩn tạm | Đổi **Trạng thái duyệt** khác `Đã duyệt` |
| Loại bỏ nhưng còn lưu | Trạng thái `Loại bỏ` |
| Xóa hẳn | **Xóa câu**, hoặc tích nhiều câu rồi xóa |
| Duyệt hàng loạt | Tích các câu → đổi trạng thái duyệt, mức khai báo, bắt buộc, triển khai → **Áp dụng** |
| Chỉ hỏi doanh nghiệp có hoạt động đặc thù | Mục **Cách trả lời & hiển thị**, chọn hoạt động |
| Quy tắc minh chứng (tab 18) | Mục **Quy tắc minh chứng** |
| Ca kiểm thử AI (tab 19) | Mục **Ca kiểm thử AI** |

Khi duyệt một câu mà để trống người duyệt và ngày duyệt, hệ thống tự điền tên bạn và ngày hôm nay.

Các quy tắc tự động:

- Nhóm câu hỏi tự tạo theo **Chủ đề** (mỗi nhóm lưu nháp tối đa 5 câu); không cần tạo hay đổi tên nhóm.
- Mã câu đã từng xuất bản không đổi được, vì câu trả lời lưu theo mã.
- Loại trả lời quyết định bộ lựa chọn và cách kiểm tra dữ liệu (thay các cột `option_set_id`, `validation_rule` của tab 12).
- Mức `Mở rộng` chỉ hỏi doanh nghiệp từ 50 người.
- Một số câu có cảnh báo vì báo cáo đang đọc theo mã; xóa hoặc ẩn sẽ làm báo cáo thiếu dữ liệu.

### 4.4 Xuất bản

**Kiểm tra & xuất bản** liệt kê lỗi (phải sửa), lưu ý (đọc rồi quyết định) và số câu thêm mới, có sửa, đã bỏ so với bản đang dùng. Bấm vào một dòng để mở câu đó. Hết lỗi mới bấm được **Xuất bản**.

Muốn quay lại bản cũ: mở bản **Đã lưu trữ** → **Xuất bản lại**.

### 4.5 Excel

- **Tải Excel** ở bất kỳ phiên bản nào: file có tab 01–10, 12, 18, 19.
- Sửa trong Excel rồi **Nhập từ Excel**: nhập thành bản nháp. Trùng số phiên bản với bản nháp thì ghi đè bản nháp đó; trùng với bản đã xuất bản hoặc lưu trữ thì phải đặt số khác.

### 4.6 Khác với Google Sheet

| Việc | Trang quản trị |
| --- | --- |
| Các tab 00, 11, 13, 14, 15, 16, 17 | Không lưu và không sửa được ở đây (website không đọc các tab này). Giữ file Sheet gốc để tra cứu; file **Tải Excel** không có các tab này |
| Lịch sử sửa từng ô, hoàn tác như Sheet | Không có. Có phiên bản: xóa bản nháp để bỏ mọi sửa đổi, hoặc xuất bản lại bản cũ |
| Nhiều người sửa cùng lúc | Được, nhưng hai người cùng sửa một ô thì người lưu sau thắng |
| Thêm lĩnh vực (ngành) mới | Cần lập trình viên, như trước |

## 5. Hệ thống (chỉ quản trị viên)

### 5.1 Tài khoản

Thêm tài khoản, đổi họ tên, vai trò, đặt lại mật khẩu, tắt **Đang hoạt động**. Không xóa tài khoản để giữ lịch sử. Hệ thống không cho vô hiệu hóa quản trị viên cuối cùng.

### 5.2 Trạng thái và cài đặt

| Phần | Nội dung |
| --- | --- |
| Cài đặt | Số ngày sau khi xuất báo cáo thì mời đánh giá (1–29); email nhận thông báo yêu cầu mới. Để trống thì dùng mặc định (5 ngày; `ADMIN_NOTIFY_EMAIL`) |
| Việc nền | Lần chạy gần nhất của từng việc, nút **Chạy ngay** |
| Thư | Thư gửi lỗi, đang chờ, đã gửi. **Gửi lại** hoặc **Xóa** thư lỗi. Thư chứa mã OTP không gửi lại được |
| Tệp lưu trữ | Tệp bị mất trên đĩa, tệp thừa (xóa được nếu cũ hơn 24 giờ), tệp đang chờ dọn, dung lượng theo loại |

## 6. Giải pháp carbon

Hai trang **Trồng rừng** và **Tín chỉ carbon** là bản mẫu, chưa lưu dữ liệu. Nay phải đăng nhập mới xem được.
