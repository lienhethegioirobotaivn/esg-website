# ESGstudio v2: Thay đổi so với bản demo cần bạn quyết định

Mỗi mục dưới đây ảnh hưởng tính năng hiện có hoặc trải nghiệm người dùng so với bản demo dùng Google Sheet. Cột "Đề xuất" là khuyến nghị của tôi.

**Trạng thái (23/11/2026):** bạn đã chốt theo cột "Đề xuất" cho tất cả QĐ-01 đến QĐ-20. Riêng QĐ-01 chốt rõ là giữ như bản demo (10 tệp, 10 MB, PDF/PNG/JPEG/WEBP) và QĐ-20 chốt Node 24 LTS. Các việc cần xác nhận lại khi tới giai đoạn liên quan vẫn giữ nguyên (ví dụ QĐ-02 đối chiếu `Code.gs` ở GĐ 4). Tác động lên schema: QĐ-12 làm bỏ bảng `upload_sessions`; QĐ-05, QĐ-06, QĐ-10 đã có bảng tương ứng. Ghi chú: các mục đánh dấu "đã chốt" là quyết định bạn đã đưa ra, liệt kê lại để đủ danh sách.

Mức ảnh hưởng: **Cao** (người dùng/quản trị thấy khác ngay), **Vừa**, **Thấp**.

| Mã | Chủ đề | Bản demo | Khi làm v2 | Mức | Đề xuất |
| --- | --- | --- | --- | --- | --- |
| QĐ-01 | Quy tắc tệp minh chứng | Code demo: tối đa 10 tệp, 10 MB/tệp, PDF/PNG/JPEG/WEBP. Bộ câu hỏi v0.1 có quy tắc minh chứng khác (ít tệp hơn, thêm XLSX, không có WEBP) | Phải chọn một bộ quy tắc chung | Vừa | Giữ như code demo (10 tệp, 10 MB, PDF/PNG/JPEG/WEBP) vì không đổi trải nghiệm; thêm XLSX nếu bạn muốn. Quy tắc theo từng câu của bộ câu hỏi nhập để dành cho AI sau này |
| QĐ-02 | Minh chứng và báo cáo của người chưa xác thực | Báo cáo xuất rồi gắn email sau qua `attachToken` (6 giờ) | Đã chốt: minh chứng chỉ lưu khi đã xác thực email. Cần chốt: bản xuất của người chưa xác thực lưu thế nào | Cao | Cho tải lên bản xuất, nhưng nếu không gắn email trong 24 giờ thì xóa; minh chứng thì chỉ cho phép sau khi xác thực (đã chốt). Xác nhận lại hành vi demo bằng `Code.gs` khi làm GĐ 4 |
| QĐ-03 | Bản nháp | Chỉ lưu trong trình duyệt | Đã chốt: người đã xác thực lưu trên server; người chưa xác thực giữ trong trình duyệt, có dialog nhắc xác thực. Bản nháp trong trình duyệt khi người dùng vừa xác thực: gộp hay ghi đè | Cao | Khi xác thực xong, tự tải bản nháp trình duyệt lên server; nếu server đã có bản khác thì hỏi người dùng chọn bản nào |
| QĐ-04 | Route theo lĩnh vực phụ và năng lực | Bộ câu hỏi chọn theo lĩnh vực chính và nhóm nhân sự | Bộ v0.1 có `sector_any` và `capability_any` (P-007, P-012): người có lĩnh vực phụ/năng lực đặc thù sẽ thấy thêm câu hỏi | Cao | Bật đúng theo bộ v0.1 (đó là ý đồ của bộ câu hỏi); người dùng thấy số câu khác bản demo |
| QĐ-05 | Tài khoản quản trị | Một mật khẩu dùng chung | Mỗi người một tài khoản (email + mật khẩu), vai trò `admin`/`content`/`ops`, nhật ký thao tác | Cao (với quản trị) | Làm như thiết kế; ban đầu tạo một tài khoản admin qua biến môi trường |
| QĐ-06 | Lượt thích bài viết | Cộng/trừ 1, không chống trùng | Mỗi người xem chỉ thích được một lần/bài (nhận diện bằng cookie ẩn danh), có thể bỏ thích | Vừa | Chống trùng; số liệu cũ giữ nguyên làm số nền |
| QĐ-07 | Mức trần OTP/ngày | 60 OTP/ngày toàn hệ thống (do giới hạn của MailApp) | Giới hạn thực là hạn mức nhà cung cấp email (Brevo free: 300 thư/ngày, đã chọn ở GĐ 2; Resend free: 100 thư/ngày); OTP cộng thông báo, mời đánh giá dùng chung hạn mức | Cao | Bỏ mức trần 60 cứng, thay bằng ngưỡng cảnh báo theo hạn mức nhà cung cấp; ưu tiên OTP trong hàng đợi; nâng gói trả phí nếu số báo cáo tăng |
| QĐ-08 | Công cụ dịch | `LanguageApp` của Google Apps Script | Gemini API; có chi phí rất nhỏ theo lượt gọi và cần khóa API | Vừa | Dùng Gemini; bản dịch cũ giữ nguyên theo hash, bản chỉnh tay luôn thắng; chỉ dịch mới các chuỗi chưa có |
| QĐ-09 | Câu trả lời của câu hỏi không còn được route tới | Chưa quy định rõ (ROUTE-03 của bộ câu hỏi) | Khi người dùng đổi lĩnh vực/năng lực, câu trả lời cũ của câu không còn hiển thị: giữ lưu nhưng loại khỏi báo cáo, hay xóa | Vừa | Giữ lưu, loại khỏi báo cáo xuất; khôi phục nếu route lại |
| QĐ-10 | Cập nhật ngân hàng câu hỏi | Sửa Sheet, hiệu lực sau tối đa 5 phút, không phiên bản | Soạn trong trang quản trị, kiểm tra, xuất bản có phiên bản; báo cáo cũ giữ bản đã dùng | Cao (với quản trị) | Làm như thiết kế; vẫn nhập được từ xlsx |
| QĐ-11 | URL ảnh bài viết | Ảnh nằm trên Drive | Ảnh lưu trên VPS, URL đổi sang `/api/v1/files/:id`; nội dung bài viết được viết lại URL khi nhập | Thấp | Làm như thiết kế; liên kết ảnh cũ ngoài website sẽ không còn hoạt động |
| QĐ-12 | Tải báo cáo theo đoạn | Đoạn 2.499.999 byte, tối đa 12 đoạn do giới hạn Apps Script | Không còn giới hạn đó | Thấp | Tải một lần qua multipart (tối đa 25 MB); bỏ tải theo đoạn, đơn giản hơn. Cần đổi phía frontend ở GĐ 8 |
| QĐ-13 | Thời hạn giữ bản nháp trên server | (không có) | Nháp không cập nhật quá hạn thì xóa | Thấp | 12 tháng, nhắc qua email trước 30 ngày nếu bạn đồng ý gửi |
| QĐ-14 | Hình thức email | Gửi từ MailApp (địa chỉ Gmail của chủ script) | Gửi từ tên miền của bạn qua nhà cung cấp; cần SPF/DKIM/DMARC; giao diện thư có thể khác | Vừa | Cấu hình tên miền gửi thư riêng; soạn lại mẫu OTP, thông báo, mời đánh giá. Hiện (GĐ 2) gửi bằng địa chỉ người gửi đã xác minh tạm ở Brevo; SPF/DKIM/DMARC làm ở giai đoạn hạ tầng |
| QĐ-15 | Thư mời đánh giá | Gửi sau 5 ngày | Giữ 5 ngày, chạy bằng job nền; mỗi báo cáo mời tối đa một lần | Thấp | Giữ nguyên; số ngày sửa được trong cài đặt admin |
| QĐ-16 | Thời hạn lưu bản xuất và minh chứng | Giữ 5 bản xuất mỗi mã báo cáo | Giữ quy tắc 5 bản; minh chứng giữ cho tới khi người dùng xóa báo cáo | Thấp | Giữ; nếu muốn có hạn tự xóa (ví dụ 24 tháng) thì quyết định thêm |
| QĐ-17 | Phiên đăng nhập hiện có | Cookie `esg-user` ký HMAC, 30 ngày | Phiên mới lưu trong database; phiên cũ không hợp lệ sau cutover: người dùng và quản trị phải đăng nhập lại một lần | Vừa | Chấp nhận, thông báo trước khi chuyển |
| QĐ-18 | Xuất file CRM | (không có, xem trong Sheet) | Nút xuất ở trang quản trị | Thấp | `.xlsx` cho nhân viên dùng Excel, thêm `.csv`; cột theo Sheet hiện tại |
| QĐ-19 | Giao diện trang quản trị | Màn hình hiện tại | Được phép làm lại | Cao (với quản trị) | Làm lại hợp lý theo vai trò; sẽ cho bạn duyệt bố cục ở GĐ 7 trước khi hoàn thiện |
| QĐ-20 | Phiên bản Node.js | (Vercel tự chọn) | Chọn một bản LTS | Thấp | Node 24 LTS (hỗ trợ tới 04/2028); chuyển Node 26 khi bạn muốn |

## Quyết định đã chốt khi làm GĐ 7 (27/11/2026)

| Việc | Chốt |
| --- | --- |
| Cách giao | Làm một lần cả trang quản trị |
| `/quan-tri` cũ | Thay hẳn |
| Quản trị bộ câu hỏi (QĐ-10) | Đầy đủ chức năng, không thiếu so với lúc dùng Sheet cho các tab website đang đọc (01–10, 12, 18, 19) |
| Cài đặt (QĐ-15) | Sửa được số ngày mời đánh giá và email nhận yêu cầu mới |
| Trang mẫu carbon | Đưa sau đăng nhập |
| Giao diện (QĐ-19) | Ưu tiên dễ dùng |

## Cách trả lời

Bạn có thể trả lời ngắn, ví dụ: "QĐ-01 theo đề xuất, QĐ-07 đổi thành ... ". Mục nào bạn chưa trả lời, tôi sẽ giữ theo cột "Đề xuất" khi đến giai đoạn liên quan và nhắc lại trước khi làm.

## Quyết định hạ tầng để sau

| Việc | Khi nào quyết |
| --- | --- |
| Nhà cung cấp VPS và cấu hình | GĐ 10 |
| Nơi lưu sao lưu ngoài máy | GĐ 10 |
| Dùng Cloudflare hay DNS ở PA Việt Nam | GĐ 10 |
| Nhà cung cấp email chính thức | Đã chốt Brevo (gói miễn phí 300 thư/ngày) ở GĐ 2; Resend là dự phòng. Tên miền gửi thư để cuối, gộp với giai đoạn hạ tầng |
