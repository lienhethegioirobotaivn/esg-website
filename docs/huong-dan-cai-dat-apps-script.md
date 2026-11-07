# Cài đặt cầu nối Google Apps Script (lưu thông tin doanh nghiệp)

Website không ghi trực tiếp vào Google Sheet. Khi người dùng bấm **Lưu thông tin doanh nghiệp**, website gọi một Apps Script gắn với file Sheet quản lý dự án. Script ghi dòng vào tab **Data khách hàng** và lưu logo vào thư mục Drive riêng tư. Chỉ cần cài một lần.

## 1. Tạo script

1. Đăng nhập tài khoản **sở hữu** file Sheet quản lý dự án và thư mục logo.
2. Mở file Sheet quản lý dự án → **Tiện ích mở rộng → Apps Script**.
3. Xóa code mẫu, dán toàn bộ nội dung file `docs/apps-script/Code.gs`, bấm **Lưu**.
4. Bấm biểu tượng bánh răng **Cài đặt dự án** → đổi **Múi giờ** thành `(GMT+07:00) Asia/Ho_Chi_Minh`.

## 2. Khai báo khóa và thư mục

Trong **Cài đặt dự án → Thuộc tính tập lệnh → Thêm thuộc tính tập lệnh**, thêm 2 dòng:

| Thuộc tính  | Giá trị                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `SECRET`    | Một chuỗi ngẫu nhiên dài (ít nhất 32 ký tự). Giữ bí mật. (hiện lấy `1t67dZNkMMejzQzF29ZMIIjQDvT-Crsir`) |
| `FOLDER_ID` | `1t67dZNkMMejzQzF29ZMIIjQDvT-Crsir` (thư mục logo khách hàng)                                           |

## 3. Cấp quyền

1. Trong trình soạn thảo, chọn hàm `authorize` ở thanh trên → **Chạy**.
2. Chọn **Xem lại quyền** → chọn tài khoản → **Nâng cao → Đi tới … (không an toàn) → Cho phép**.
3. Xem **Nhật ký thực thi**: phải thấy tên thư mục, dòng tiêu đề và danh sách cột. Nếu báo lỗi, đọc nội dung lỗi (thường là sai `FOLDER_ID` hoặc đổi tên tab).

## 4. Triển khai

1. **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**.
2. **Thực thi dưới tên:** Tôi. **Người có quyền truy cập:** Bất kỳ ai.
3. Bấm **Triển khai**, sao chép **URL ứng dụng web** (kết thúc bằng `/exec`).

Mỗi lần sửa code về sau: **Triển khai → Quản lý bản triển khai → biểu tượng bút → Phiên bản mới → Triển khai**. URL giữ nguyên.

## 5. Khai báo cho website

Trong `apps/web/.env.local`:

```
GOOGLE_APPS_SCRIPT_URL=<URL kết thúc bằng /exec>
GOOGLE_APPS_SCRIPT_SECRET=<đúng chuỗi SECRET ở bước 2>
```

Xóa các biến cũ không còn dùng (`GOOGLE_SHEET_PROJECT_ID`, các biến Drive). Khởi động lại `pnpm dev`. Khi deploy, khai báo cùng 2 biến trong cấu hình môi trường của nơi host.

## 6. Cột nên thêm trong tab Data khách hàng

Website gửi 15 trường. Sheet hiện thiếu 2 cột, nên chưa lưu được:

- `Kỳ báo cáo`
- `Phạm vi báo cáo`

Thêm 2 cột này vào **cuối dòng tiêu đề** (tên viết đúng). Nếu chưa thêm, mọi thứ khác vẫn lưu bình thường và server chỉ ghi cảnh báo trong log.

## 7. Cách script hoạt động và lưu ý

- Script tìm cột theo **tên tiêu đề**, không theo vị trí. Đổi thứ tự cột thoải mái, nhưng **không đổi tên** các cột trong bảng trên (đặc biệt `Mã báo cáo`).
- Mỗi doanh nghiệp có một **Mã báo cáo** dạng `ESG-20260102-AB3K`, lưu trong trình duyệt. Lưu lại lần nữa thì **cập nhật cùng dòng**, không tạo dòng mới. Xóa dữ liệu trình duyệt hoặc bấm đặt lại sẽ tạo mã và dòng mới.
- Dòng mới tự có **Ngày tạo** và **Trạng thái hồ sơ = Bản nháp**.
- Logo nằm trong thư mục con mang tên mã báo cáo, **Link hồ sơ bảo mật** trỏ tới thư mục đó. Thư mục không chia sẻ công khai.
- Các cột ghi chú, người phụ trách, trạng thái chăm sóc… do người quản trị tự nhập. Script **không ghi đè** các cột này.
- Script ghi vào dòng trống đầu tiên bên dưới tiêu đề, trong vùng đã có kiểm tra dữ liệu (dòng 6–205).
- Nếu cần đổi khóa: đổi `SECRET` ở Script Properties và `.env.local` cùng lúc.

## 8. Form Tư vấn, Kiểm định độc lập và Góp ý

Header có menu **Tư vấn** (Tư vấn, Kiểm định độc lập), cuối trang khảo sát có ô **Góp ý**. Cả ba gửi qua cùng Apps Script.

**Tab tiếp nhận tư vấn và kiểm định** (action `saveInquiry`): script tự tìm tab có cột `Mã yêu cầu` (tiêu đề nằm trong 30 dòng đầu). Muốn chỉ định tab, thêm Script Property `INQUIRY_SHEET_NAME`.

- Web ghi các cột: `Mã yêu cầu` (dạng `TV-20261107-AB3K` hoặc `KD-...`), `Thời gian gửi`, `Loại yêu cầu` (Tư vấn / Kiểm định), `Tên doanh nghiệp`, `Thông tin / nhu cầu`, `Quy mô nhân sự`, `Ngành nghề`, `Số điện thoại`, `Email`.
- Khi tạo dòng mới: `Trạng thái xử lý` = Mới tiếp nhận, `Mức ưu tiên` = Bình thường, `Nguồn gửi` = Website, `Đồng ý liên hệ` = Có, `Thời điểm đồng ý`, `Phiên bản form` = v1, `Đồng bộ lúc`.
- Các cột còn lại (`Người phụ trách`, `Liên hệ lần đầu`, `Hẹn liên hệ tiếp`, `Kết quả / bước tiếp`, `Ghi chú nội bộ`) do người quản trị nhập, script không đụng tới.

**Tab Góp ý** (action `saveFeedback`): script tự tạo tab `Góp ý` ở lần gửi đầu, gồm các cột `Mã góp ý`, `Thời gian gửi`, `Ý kiến`, `Email`, `Đã gửi email mời góp ý`, `Nguồn gửi`, `Phiên bản form`.

**Email thông báo:** thêm Script Property `NOTIFY_EMAIL` (địa chỉ nhận yêu cầu và góp ý mới). Chưa khai báo thì bỏ qua bước gửi email.

**Email mời góp ý sau 5 ngày:**

1. Thêm Script Property `SITE_URL` (không bắt buộc, link đặt trong email).
2. Chạy hàm `installFeedbackTrigger` một lần (cấp quyền gửi mail khi được hỏi). Hàm tạo trigger chạy mỗi ngày lúc 9 giờ.
3. Mỗi ngày `sendFeedbackInvites` quét tab `Góp ý`: dòng có email, đã quá 5 ngày và cột `Đã gửi email mời góp ý` còn trống thì gửi email, rồi ghi thời điểm gửi vào cột đó (không gửi trùng).
4. Gmail thường giới hạn khoảng 100 email mỗi ngày với tài khoản cá nhân.

Cột nào thiếu tên thì dữ liệu của cột đó không được ghi, mọi cột còn lại vẫn lưu. Sau khi sửa `Code.gs`, nhớ triển khai **Phiên bản mới** (mục 4).
