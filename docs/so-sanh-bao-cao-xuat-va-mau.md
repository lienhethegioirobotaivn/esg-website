> **Lưu ý:** bản chụp ngày 04/11/2026, một số mục đã đổi. Từ sau đó đã làm: thẻ Kế hoạch cải thiện ESG (thay cho cột phụ trách/hạn tự sinh), minh chứng nhóm theo câu hỏi, bảng căn cứ nêu tên nội dung, gợi ý ưu tiên, phụ lục tách cột. Trạng thái mới nhất xem `boi-canh-du-an.md` mục 7 và 8.

# So sánh báo cáo PDF xuất từ web và file báo cáo mẫu (v3)

Nguồn đối chiếu: `ESG_Mau_to_vang_Do_hoa_v3.md` (mẫu), `THEGIOIROBOT_Demo_ESG_Do_hoa_v3.md` (bản demo điền sẵn).

## 1. Kết luận ngắn

- **Bố cục, thứ tự mục, văn bản cố định, bảng, cách đánh số trang và mục lục: đã giống mẫu.**
- **Chưa giống 100%.** Phần còn lệch đều là phần phụ thuộc dữ liệu hoặc tài nguyên mà web chưa có: ảnh minh hoạ, icon, người phụ trách/hạn trong kế hoạch hành động, mô tả riêng cho từng tệp minh chứng, số liệu theo tháng, Scope 1/2, số liệu SDG chưa được xác minh.
- Đây là các điểm "khác do thiếu dữ liệu", không phải lỗi dàn trang. Chúng nằm trong mục 4 và mục 5.
- Báo cáo xuất ra vẫn ghi "bản nháp" ở trang xác nhận khi thiếu dữ liệu bắt buộc. Header từng trang đã bỏ chữ "BẢN NHÁP" theo yêu cầu.

## 2. Đã làm và giống mẫu

| Hạng mục | Trạng thái |
|---|---|
| Trang bìa (nền trắng, kiểu cơ bản/hiện đại, không dùng màu xanh) | Giống về cấu trúc: logo, tên doanh nghiệp, kỳ báo cáo, mã báo cáo |
| Mục lục có số trang thật (render 2 lượt) | Giống |
| Thứ tự các phần báo cáo (hồ sơ doanh nghiệp, tổng quan, E/S/G, khung tham chiếu, kế hoạch hành động, minh chứng, xác nhận) | Giống |
| Hồ sơ doanh nghiệp (P-001…P-025, đọc qua trường của form) | Giống |
| Câu chữ dẫn dắt/diễn giải từng mục | Giống (sinh theo quy tắc, không dùng AI) |
| Biểu đồ | Có, vẽ từ dữ liệu trả lời |
| Danh sách đầy đủ (không còn "và N nội dung khác") | Làm xong. Ngoại lệ có chủ ý: 3 ưu tiên và 3 trọng tâm |
| Nội dung cần làm rõ (placeholder dễ hiểu) | Giống |
| Ảnh minh chứng từ tệp khách hàng tải lên | Có; hiển thị mục đích của tệp để người đọc biết tệp dùng làm gì |
| Danh sách tệp minh chứng | Có |
| Header/footer, đánh số trang, không chồng chữ | Đã sửa lỗi chồng đè |
| Lưu doanh nghiệp khi bấm xuất báo cáo | Có |
| Giải thích trên web vì sao là bản nháp, có link nhảy tới câu hỏi C-060 | Có |

## 3. Khác nhau còn lại (xuất ra so với mẫu)

| # | Điểm khác | Nguyên nhân | Hướng xử lý |
|---|---|---|---|
| 1 | Mẫu có ảnh minh hoạ/icon trang trí; bản xuất chỉ có chữ, bảng, biểu đồ | Chưa có nguồn ảnh/icon | Cần bộ ảnh/icon từ sếp (chưa làm) |
| 2 | Kế hoạch hành động: mẫu có cột người phụ trách, hạn; bản xuất để "cần xác nhận" | Web chưa có ô nhập | **Hoãn theo yêu cầu**, chờ xác minh |
| 3 | Minh chứng: mẫu mô tả riêng từng tệp; bản xuất dùng mô tả chung theo câu hỏi | Web chưa có ô nhập mô tả theo tệp | **Hoãn theo yêu cầu**, chờ xác minh |
| 4 | Điện năng theo tháng, Scope 1/2: mẫu có bảng/biểu đồ chi tiết; bản xuất chỉ có số tổng khi người dùng nhập | Bộ câu hỏi chưa thu số liệu theo tháng/Scope | Cần thêm câu hỏi vào Sheet và mở rộng model |
| 5 | Số liệu SDG trong khung tham chiếu | Chưa xác minh với sếp | Chờ xác minh |
| 6 | Ưu tiên cải thiện lặp cùng một câu | Cột `improvementHint` trong Sheet | Sửa nội dung Sheet nếu muốn |
| 7 | Ánh xạ câu hỏi sang trang báo cáo nằm trong code | Chưa chuyển vào cột Sheet | **Hoãn theo yêu cầu** |
| 8 | Phụ lục: mẫu có bản rút gọn; bản xuất liệt kê đầy đủ nên có thể dài hơn mẫu | Bỏ ẩn bớt nội dung theo yêu cầu | Có thể thêm bản rút gọn nếu cần |
| 9 | Phông chữ: dùng DejaVu Sans, mẫu Word dùng phông khác | Giới hạn nhúng phông của react-pdf | Thay phông nếu có file phông được cấp phép |

Số trang cụ thể phụ thuộc dữ liệu từng doanh nghiệp, nên có thể lệch so với 39 trang của mẫu.

## 4. Chưa làm

- Ô nhập người phụ trách và hạn cho kế hoạch hành động (hoãn).
- Ô nhập mô tả riêng cho từng tệp minh chứng (hoãn).
- Đưa ánh xạ câu hỏi → trang báo cáo vào cột Sheet (hoãn).
- Bảng điện theo tháng, Scope 1/2 (cần câu hỏi mới).
- Ảnh/icon trang trí.
- Xác minh số liệu SDG với sếp.
- Lưu "Thông tin doanh nghiệp" vào bản nháp trình duyệt (đang thực hiện, xem dưới).

## 5. Lưu ý về lưu trên trình duyệt

Nút "Lưu thông tin doanh nghiệp" hiện chỉ gửi lên Google Sheet và lưu mã báo cáo. Nó chưa ghi lại bản nháp trong localStorage như nút "Lưu bản nháp". Cần gọi hàm lưu bản nháp sau khi lưu thành công.
