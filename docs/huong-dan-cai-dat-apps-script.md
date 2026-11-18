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

### Dịch nội dung động (bộ câu hỏi, bài viết, số liệu)

Chữ lấy từ Sheet (câu hỏi, hướng dẫn, bài viết, số liệu thành tựu) không nằm trong code nên được dịch lúc có người xem và lưu vào tab **Bản dịch** của chính Google Sheet này (script tự tạo tab lần đầu). Cần dán lại `Code.gs` và tạo **Phiên bản mới** như trên vì có thêm hai hành động `listTranslations` và `saveTranslations`.

- Mỗi dòng là một câu tiếng Việt gốc, khóa là mã băm của câu (cột A). Cột `en`, `fr`, `zh` là bản dịch tự động.
- **Sửa tay:** ghi bản dịch đúng vào cột `en (sửa tay)`, `fr (sửa tay)` hoặc `zh (sửa tay)`. Cột sửa tay luôn thắng cột tự động và không bao giờ bị ghi đè. Sau tối đa 1 phút website tự lấy bản mới.
- **Sửa chữ gốc trong Sheet câu hỏi hoặc trong trang quản trị:** câu mới có mã băm mới nên được dịch lại tự động; dòng của câu cũ nằm lại trong tab, xóa tay nếu muốn gọn.
- **Lần đầu mở một ngôn ngữ:** người xem đầu tiên thấy phần chưa dịch bằng tiếng Việt, việc dịch chạy nền ngay sau khi trả trang (hàng chục chuỗi mỗi lượt) và người xem sau thấy bản đã dịch. Để tránh điều này, đăng nhập `/quan-tri`, mở mục **Bản dịch** và bấm **Dịch sẵn nội dung**: toàn bộ bộ câu hỏi, bài viết đã đăng và số liệu được dịch trước sang cả ba ngôn ngữ (giữ trang mở tới khi báo xong, có thể bấm lại nếu bị ngắt). Chạy sau mỗi lần cập nhật nội dung lớn. Khi vẫn còn câu chưa dịch, trang chờ tối đa 8 giây rồi mới trả kết quả.
- Thuật ngữ trong `glossary.json` (`keep`, `exact`, `terms`) áp dụng cho cả nội dung động.
- Chuỗi dịch lỗi hoặc làm mất thuật ngữ được bỏ qua và thử lại sau 10 phút, trong lúc đó vẫn hiện tiếng Việt.

### Dọn bản dịch không còn dùng và câu hỏi thường gặp

Cần dán lại `Code.gs` và tạo **Phiên bản mới** vì có thêm hành động `pruneTranslations`.

- Tab "Bản dịch" tự được dọn: sau khi lưu hoặc xóa bài, lưu số liệu, và ở cuối nút **Dịch sẵn nội dung**. Dòng nào không còn thuộc bộ câu hỏi, bài viết (kể cả bản nháp) hoặc nhãn số liệu thì bị xóa. Dòng có chữ ở cột `(sửa tay)` luôn được giữ, muốn bỏ thì xóa tay. Nếu web không lấy được dữ liệu (bộ câu hỏi lỗi, rỗng) việc dọn dừng lại và không xóa gì.
- **Có cả `en` và `en (sửa tay)` thì dùng bản nào?** Bản sửa tay; ô sửa tay trống thì dùng bản tự động. Dịch tự động không bao giờ ghi đè cột sửa tay.
- **Sửa tay xong bao lâu web đổi?** Tối đa khoảng 1 phút.
- **Đổi chữ gốc tiếng Việt thì sao?** Câu mới có mã băm mới, được dịch lại; bản sửa tay của câu cũ không tự theo sang, cần nhập lại ở dòng mới.
- **Thêm hoặc sửa câu hỏi trong Sheet câu hỏi?** Tự được dịch khi có người xem hoặc khi bấm **Dịch sẵn nội dung**.
- **Trang ở `/en`, `/fr`, `/zh` còn tiếng Việt xen lẫn?** Bấm **Dịch sẵn nội dung** và giữ trang mở tới khi báo xong. Nên làm trước khi gửi sitemap cho Google để tránh nội dung trùng giữa các ngôn ngữ.

### Tự động dịch, không cần bấm nút

1. Trên web (Vercel hoặc nơi host), đặt biến môi trường `CRON_SECRET` là một chuỗi ngẫu nhiên dài từ 16 ký tự trở lên rồi deploy lại.
2. Trong Apps Script: **Project Settings → Script Properties**, thêm `WEB_BASE_URL` (địa chỉ website, ví dụ `https://esg.example.vn`, không có dấu `/` ở cuối) và `WEB_CRON_SECRET` (đúng bằng `CRON_SECRET`).
3. Dán lại `Code.gs`, chọn hàm `installTranslationTriggers` rồi bấm **Run** một lần và cấp quyền (cần quyền gọi dịch vụ bên ngoài và quản lý trigger). Kiểm tra mục **Triggers** có hai trigger: `runScheduledTranslationSync` (mỗi 10 phút) và `onTranslationSourceEdit` (khi sửa Sheet).
4. Thử ngay: chọn `runTranslationSync` rồi **Run**, xem **Executions** không báo lỗi; tab "Bản dịch" bắt đầu có dòng mới.

Cách hoạt động: lưu hoặc xóa bài và lưu số liệu trên trang quản trị tự dịch ngay. Sửa Sheet câu hỏi đặt một cờ, trong tối đa 10 phút trigger gọi web dịch phần mới và dọn dòng mồ côi (không dọn dòng có chữ sửa tay). Ngoài ra mỗi 24 giờ chạy một lượt đầy đủ. Nếu Apps Script báo "Web trả về mã 401", `WEB_CRON_SECRET` đang khác `CRON_SECRET`; mã 503 nghĩa là web chưa đặt `CRON_SECRET`.

## 12. Lưu báo cáo đã xuất

Cần dán lại `Code.gs` và tạo **Phiên bản mới** (Triển khai → Quản lý bản triển khai → biểu tượng bút → Phiên bản mới → Triển khai) vì có thêm hành động `uploadReportChunk` và `finishReport`.

1. Dán lại toàn bộ `Code.gs`, lưu.
2. Chọn hàm `installReportCleanupTrigger`, bấm **Run** một lần và cấp quyền Drive. Kiểm tra mục **Triggers** có `cleanupReportUploads` chạy mỗi ngày.
3. Thử: trên web làm khảo sát, bấm **Tạo báo cáo**; dialog hiện "Đã lưu báo cáo vào hệ thống."

Dữ liệu được tạo tự động:

- Tab **Báo cáo đã xuất**: mỗi lần xuất một dòng (mã lần xuất, mã báo cáo, thời gian, ngôn ngữ, trạng thái, doanh nghiệp, giao diện, id và tên file PDF/Word, **link file PDF và link file Word**, email đã xác thực). Bấm chữ "Mở PDF" hoặc "Mở Word" (chữ có gắn liên kết) ở dòng tương ứng để mở file trong Drive (chỉ tài khoản chủ Drive mở được, file không chia sẻ công khai). Nếu tab này có từ bản cũ chưa có cột link, các cột link tự được thêm ở cuối và các dòng cũ được ghi bù ở lần xuất kế tiếp; muốn ghi bù ngay thì chọn hàm `backfillReportLinks` rồi bấm **Run**. Ô nào đang hiện `#ERROR!` (từ bản dùng công thức `HYPERLINK`) cũng được ghi đè đúng khi chạy hàm này.
- Tab **Nội dung khảo sát**: câu trả lời, hồ sơ doanh nghiệp, kế hoạch cải thiện của từng lần xuất (cắt thành các ô 40.000 ký tự).
- Thư mục Drive theo mã báo cáo chứa file PDF và Word; thư mục **Tải lên tạm** chứa mảnh đang tải, tự dọn sau 24 giờ.
- Mỗi mã báo cáo giữ 5 lần xuất mới nhất; bản cũ bị xóa cả file Drive lẫn hàng trong Sheet. Mã báo cáo phải có sẵn trong tab Data khách hàng.
- Ảnh minh chứng không được lưu.

## 13. Xác nhận email bằng mã OTP

Cần dán lại `Code.gs` và tạo **Phiên bản mới** vì có thêm các hành động `otpRequest`, `otpVerify`, `setReportOwner`. Không cần trigger mới.

1. Trên web (Vercel và `apps/web/.env.local`) đặt `USER_SESSION_SECRET` là chuỗi ngẫu nhiên từ 32 ký tự trở lên rồi deploy lại. Thiếu biến này thì khung nhập email không dùng được (web báo chưa bật); việc lưu báo cáo vẫn chạy bình thường. Đổi giá trị biến này sẽ làm mọi người dùng bị đăng xuất.
2. Dán lại `Code.gs`, tạo Phiên bản mới. Lần đầu gửi mã, Google có thể yêu cầu cấp lại quyền gửi email (đã cấp từ trước cho form Tư vấn thì thường không hỏi lại).
3. Tùy chọn: thêm cột `Email đã xác thực` vào dòng tiêu đề của tab **Data khách hàng** để người quản lý thấy email liên hệ ngay ở bảng đang dùng. Thiếu cột thì bỏ qua, không lỗi.
4. Thử: trên web làm khảo sát, bấm **Tạo báo cáo**, nhập email của bạn ở khung "Xem lại báo cáo sau", bấm **Gửi mã**, mở email (xem cả thư rác), nhập mã. Kiểm tra tab **Báo cáo đã xuất**: cột `Email đã xác thực` của lần xuất vừa tạo có email.

Quy tắc và nơi đổi:

| Quy tắc | Giá trị | Nơi đổi |
| --- | --- | --- |
| Độ dài và hiệu lực mã | 6 số, 10 phút | `OTP_TTL_SECONDS` trong `Code.gs`; `EMAIL_OTP_RULES` trong `packages/shared/src/auth.ts` |
| Số lần nhập sai | 5, sai lần 5 thì hủy mã | `OTP_MAX_TRIES` |
| Chờ giữa hai lần gửi | 60 giây | `OTP_RESEND_SECONDS` |
| Số mã mỗi email mỗi giờ | 3 | `OTP_PER_EMAIL_PER_HOUR` |
| Số mã mỗi ngày cho cả hệ thống | 60 | `OTP_DAILY_LIMIT` |
| Dừng khi hạn mức email Google còn dưới | 10 | `OTP_MIN_MAIL_QUOTA` |

Khi đổi một quy tắc, đổi cả hai nơi (Apps Script và `EMAIL_OTP_RULES`) để thông báo trên web khớp.

Lưu ý quan trọng:

- Tài khoản Google chạy Apps Script là Gmail thường nên chỉ gửi được khoảng 100 người nhận mỗi ngày, **dùng chung** với email Tư vấn, Kiểm định, Góp ý và email mời đánh giá. Vì vậy mới đặt trần 60 mã mỗi ngày. Chạm trần thì web báo "Hệ thống tạm thời chưa gửi thêm được mã xác nhận, vui lòng thử lại vào ngày mai" và việc lưu báo cáo vẫn chạy. Xem hạn mức còn lại và số mã đã gửi hôm nay: chọn hàm `logMailQuota`, bấm **Run**, xem **Execution log**. Lưu lượng lớn thì chuyển sang Google Workspace (khoảng 1.500 mỗi ngày) hoặc dịch vụ gửi mail riêng.
- Mã OTP được giữ trong `CacheService` (chỉ dạng băm, tự hết hạn sau 10 phút) nên không có tab hay dữ liệu OTP nào trong Sheet. Số mã đã gửi trong ngày nằm ở Script Property `OTP_DAY` (dạng `yyyyMMdd:số lượng`); không cần sửa tay.
- Email gửi đi có tên người gửi "ESG Report Online", nội dung theo ngôn ngữ trang đang xem (vi, en, fr, zh) và nằm trong `apps/web/src/server/auth/otp-mail.ts`.
- Một email chỉ gắn được vào lần xuất khi ô `Email đã xác thực` của lần xuất đó còn trống; muốn đổi chủ sở hữu thì sửa tay ô này trong Sheet.
- Dữ liệu cá nhân (email, thông tin doanh nghiệp, câu trả lời) được lưu lâu dài. Cần có dòng giải thích trong chính sách quyền riêng tư (việc của GĐ4); hiện trong hộp thoại có câu "Email chỉ dùng để xác nhận và để bạn xem lại báo cáo."
- **Đổi email:** nút "Dùng email khác" trên web chỉ đăng xuất trình duyệt đó. Dữ liệu đã gắn email cũ (cột `Email đã xác thực`, báo cáo trong Drive) **không bị xóa hay đổi**. Xác nhận email khác thì từ đó các lần xuất mới thuộc email mới; lần xuất đang mở (đã thuộc email cũ) được xuất lại thành một dòng mới cho email mới. Cột `Email đã xác thực` ở `Data khách hàng` lưu email gần nhất của mã báo cáo.
