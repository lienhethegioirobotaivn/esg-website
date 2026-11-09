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

## 9. Trang "Về ESG Report Online" và trang quản trị

Trang công khai: `/ve-esg-report-online` (Thành tựu, Tin tức). Trang quản trị: `/quan-tri`.

**Cập nhật Apps Script:** dán lại toàn bộ `docs/apps-script/Code.gs`, rồi **Triển khai > Quản lý bản triển khai > bút chì > Phiên bản mới > Triển khai** (sửa bản cũ, không tạo bản triển khai mới để giữ nguyên URL). Không cần thêm Script Property mới.

**Tab tự tạo** ở lần ghi đầu tiên:

- `Bài viết`: mỗi dòng là một bài (mã bài, mục, slug, chuyên mục, tiêu đề, tóm tắt, ảnh bìa, tác giả, phút đọc, ngày đăng, nổi bật, đọc nhiều, chuyên đề, trạng thái, nội dung JSON, lượt tim). Nên sửa bài qua trang quản trị. Không đổi tên cột.
- `Số liệu thành tựu`: tối đa 8 dòng gồm thứ tự, giá trị, nhãn.

**Ảnh:** script tự tạo thư mục con `Ảnh trang Về ESG Report Online` trong thư mục `FOLDER_ID`, chia sẻ "ai có đường liên kết đều xem được" để hiện ảnh trên web. Chỉ tải ảnh có thể công khai. Ảnh tối đa 3 MB, trình duyệt tự thu nhỏ về chiều rộng 1600px.

**Biến môi trường** (`apps/web/.env.local` và Vercel):

- `ADMIN_PASSWORD`: mật khẩu chung của người quản trị, tối thiểu 8 ký tự. Chưa đặt thì `/quan-tri` báo chưa cấu hình.
- `ADMIN_SESSION_SECRET`: không bắt buộc, tối thiểu 16 ký tự, dùng ký phiên đăng nhập. Không đặt thì dùng `ADMIN_PASSWORD`. Đổi giá trị này sẽ đăng xuất mọi người.

**Lưu ý vận hành:**

- Khi chưa cấu hình Apps Script, web hiện dữ liệu mẫu. Khi đã cấu hình, web chỉ hiện dữ liệu thật (chưa có bài thì hiện thông báo trống, chưa có số liệu thì ẩn dải số liệu).
- Bài lưu ở trạng thái Nháp không hiện ra công khai.
- Trang công khai lưu đệm 60 giây, bài mới có thể hiện sau tối đa 1 phút.
- Lượt tim không chống trùng theo người, mỗi trình duyệt thả được một lần cho mỗi bài.
- Đăng nhập sai quá 5 lần trong 15 phút sẽ bị khóa tạm theo IP.

### Trình soạn bài (giống Google Docs)

Ô "Nội dung bài viết" là trình soạn giàu định dạng: tiêu đề lớn/nhỏ, in đậm, nghiêng, gạch chân, liên kết, căn trái/giữa/phải/đều hai bên, danh sách, khung trích dẫn, đường kẻ ngang.

- **Ảnh:** dán trực tiếp (Ctrl+V), kéo thả từ máy tính, hoặc bấm nút chèn ảnh. Ảnh tự thu nhỏ rồi tải lên Drive. Bấm vào ảnh để căn trái/giữa/phải, chọn cỡ 25/50/75/100% và nhập mô tả ảnh.
- **Bài cũ** (soạn bằng trình cũ gồm đoạn văn, tiêu đề mục, khung nổi bật) tự chuyển sang định dạng mới khi mở, khung nổi bật trở thành khung trích dẫn. Không cần sửa dữ liệu trong Sheet.
- **Nội dung dài:** nội dung bài được lưu dạng JSON. Bài ngắn nằm trong cột `Nội dung (JSON)` của tab `Bài viết`. Bài dài hơn 40.000 ký tự được chia mảnh và lưu ở tab `Nội dung bài viết` (tự tạo, gồm `Mã bài`, `Phần`, `Nội dung`), cột `Nội dung (JSON)` chỉ ghi `@chunks:N`. Đừng sửa hoặc xóa tab này bằng tay. Giới hạn hiện tại khoảng 400.000 ký tự dữ liệu lưu (cỡ vài chục nghìn từ) và 1.000 khối.
- **Bảng:** nút chèn bảng tạo bảng 3x3 có hàng tiêu đề. Khi con trỏ nằm trong bảng, thanh công cụ hiện nút thêm/xóa hàng, cột, bật tắt hàng tiêu đề và xóa bảng. Phím Tab chuyển ô.
- **Chú thích ảnh:** bấm vào ảnh, nhập "Chú thích ảnh", chú thích hiện dưới ảnh trên trang công khai (chưa hiện trong ô soạn).
- Chỉ các định dạng trên được giữ lại. Nội dung dán từ nguồn khác bị loại bỏ phần không hỗ trợ (màu chữ, cỡ chữ, bảng…). Ảnh dán từ trang web khác phải là đường dẫn https.
- **Cần cập nhật Apps Script** (dán lại `Code.gs` và triển khai Phiên bản mới) để lưu được bài dài. Bài ngắn vẫn lưu được với bản cũ.

### Chỉnh ảnh bìa

Khi chọn ảnh bìa, hộp "Chỉnh ảnh bìa" tự mở:

- Kéo ảnh để căn vị trí, dùng thanh trượt (hoặc con lăn chuột, phím + và -) để phóng to từ 100% đến 400%, xoay trái/phải, đặt lại.
- Ảnh được cắt theo tỉ lệ 16:9 (cỡ 1600x900) như thẻ tin trên web. Vùng tối ở trên và dưới khung cho biết phần ảnh sẽ bị cắt ở đầu trang bài viết (tỉ lệ 2,7:1). Tắt vùng này bằng ô tích bên dưới.
- Bấm "Dùng ảnh này" để tải lên. Sau khi tải, nút "Chỉnh lại ảnh" mở lại ảnh gốc vừa chọn để căn lại. Nút này chỉ có trong lần soạn hiện tại. Mở lại bài đã lưu, muốn căn lại thì chọn lại file ảnh gốc bằng "Đổi ảnh".
- Không cần cập nhật Apps Script cho phần này.

### Nơi lưu ảnh và dọn ảnh không còn dùng

- Ảnh (ảnh bìa và ảnh trong bài) nằm trong thư mục Drive `Ảnh trang Về ESG Report Online`, bên trong thư mục `FOLDER_ID`. Trong Sheet chỉ lưu đường dẫn ảnh.
- Xóa bài, đổi ảnh bìa hoặc xóa ảnh khỏi bài rồi lưu: ảnh không còn bài nào dùng (kể cả bản nháp) sẽ được chuyển vào Thùng rác của Drive. Ảnh còn được bài khác dùng thì giữ lại. Chỉ ảnh nằm trong thư mục ảnh trên mới bị dọn.
- Ảnh trong Thùng rác khôi phục được trong 30 ngày, sau đó Drive tự xóa vĩnh viễn. Cần dán lại `Code.gs` và triển khai Phiên bản mới.
- Ảnh đã tải lên nhưng chưa bao giờ được lưu vào bài (ví dụ đóng trình soạn giữa chừng) không bị dọn tự động, cần xóa tay trong thư mục.

## 10. SEO (trang chủ, bài đăng, sitemap, robots)

**Biến môi trường bắt buộc khi chạy thật:** `NEXT_PUBLIC_SITE_URL` là địa chỉ website công khai, ví dụ `https://esgreportonline.vn`, không có dấu `/` ở cuối. Đặt trong `apps/web/.env.local` và trong Vercel (Settings > Environment Variables, môi trường Production), rồi triển khai lại. Không đặt thì sitemap, robots, canonical và ảnh chia sẻ dùng địa chỉ tạm của Vercel (hoặc `http://localhost:3000` khi chạy máy cá nhân), không đúng cho Google.

**Những gì đã có:**

- Tiêu đề dạng `Tên trang | ESG Report Online`, mô tả, thẻ canonical và thẻ chia sẻ (Facebook, Zalo, X) cho trang chủ, Thành tựu, Tin tức và từng bài đăng. Bài đăng dùng tiêu đề, tóm tắt (cắt gọn 160 ký tự) và ảnh bìa của chính bài đó, không có ảnh bìa thì dùng ảnh mặc định `public/og-default.png` (1200x630).
- Dữ liệu có cấu trúc (JSON-LD): Organization và WebSite cho trang chủ, Article và BreadcrumbList cho từng bài.
- `/sitemap.xml` tự cập nhật theo bài đã đăng (không có bài nháp, không có bài mẫu), kèm ảnh bìa. `/robots.txt` cho phép tìm kiếm, chặn `/quan-tri`, `/api/` và `/cong-cu-ai`.
- Trang Trồng rừng, Mua tín chỉ carbon (đang cập nhật) và các trang quản trị được đặt `noindex`. Bài mẫu hiện khi chưa kết nối Apps Script cũng `noindex`.

**Sau khi đưa lên production:**

1. Mở `https://<tên miền>/robots.txt` và `https://<tên miền>/sitemap.xml` để kiểm tra địa chỉ hiển thị đúng tên miền thật.
2. Vào Google Search Console, thêm website, chọn Sitemaps, nhập `sitemap.xml`.
3. Kiểm tra chia sẻ: dán địa chỉ một bài vào Facebook Sharing Debugger hoặc Zalo, xem tiêu đề, mô tả, ảnh. Facebook lưu đệm ảnh cũ, cần bấm "Scrape Again" nếu đã chia sẻ trước đó.
4. Muốn bài lên Google nhanh hơn, vào Search Console, dùng "Kiểm tra URL" rồi "Yêu cầu lập chỉ mục" cho bài mới.

**Mẹo viết bài để SEO tốt:** tiêu đề dưới khoảng 60 ký tự, tóm tắt 120–160 ký tự (phần tóm tắt là mô tả hiện trên Google), luôn có ảnh bìa rõ nét, đặt mô tả ảnh (alt) cho ảnh trong bài.

## 11. Dịch tự động (đa ngôn ngữ)

Apps Script có thêm hành động `translate` (dùng dịch vụ `LanguageApp` của Google, miễn phí, không cần khóa riêng). Lệnh `pnpm --filter web i18n:sync` gọi hành động này để dịch các chuỗi giao diện tiếng Việt mới sang tiếng Anh, Pháp, Trung.

**Cài đặt:**

1. Dán lại toàn bộ `docs/apps-script/Code.gs`.
2. Chạy hàm `authorize` một lần trong trình soạn script và cấp quyền nếu Google hỏi (hàm này gọi thử `LanguageApp`).
3. Triển khai > Quản lý bản triển khai > bút chì > **Phiên bản mới** (không tạo bản triển khai mới vì địa chỉ sẽ đổi).
4. Không cần biến mới: dùng chung `GOOGLE_APPS_SCRIPT_URL` và `GOOGLE_APPS_SCRIPT_SECRET`.

**Cách dùng hằng ngày:**

- Viết chữ giao diện bằng tiếng Việt trong code dưới dạng `t("Câu tiếng Việt")` (hoặc `msg("...")` cho hằng số ngoài component). Câu tiếng Việt chính là khóa.
- `pnpm dev` và `pnpm build` tự chạy `i18n:sync` trước. Lệnh quét code, bỏ bản dịch của chuỗi không còn dùng, và chỉ dịch chuỗi mới hoặc đã đổi chữ. Lỗi mạng hoặc chưa cấu hình thì chỉ cảnh báo, không chặn chạy; chuỗi chưa dịch hiện tiếng Việt.
- Bản dịch lưu ở `apps/web/src/i18n/messages/{en,fr,zh}.json` (do công cụ tự sinh, không sửa tay). Muốn sửa riêng một bản dịch, ghi vào `apps/web/src/i18n/overrides/{en,fr,zh}.json` với khóa là câu tiếng Việt: bản ghi đè luôn thắng và không bị xóa.
- `apps/web/src/i18n/glossary.json`: `keep` là từ giữ nguyên (ESG, Scope 1...), `exact` là chuỗi dịch cố định nguyên câu, `terms` là thuật ngữ được thay đúng bản dịch quy định khi gặp trong câu.
- `pnpm --filter web i18n:check` báo lỗi (mã thoát 1) nếu còn chuỗi chưa có bản dịch, dùng khi muốn kiểm tra trước khi triển khai.
- Hạn mức dịch theo ngày của Google Apps Script có giới hạn. Nếu gặp lỗi hết hạn mức, chạy lại `i18n:sync` vào ngày hôm sau, lệnh sẽ dịch tiếp phần còn thiếu.
