# Bối cảnh dự án ESGstudio (file bàn giao cho phiên làm việc mới)

Đọc file này trước khi làm. Tình trạng: phần 1–11 cập nhật đến ngày 05/11/2026, phần 12 (trang Về ESG Report Online, trang quản trị, Tư vấn, SEO) cập nhật đến ngày 08/11/2026. Mục nào ghi "cần kiểm tra" là điều chưa được xác nhận trong mã nguồn lúc viết.

## 1. Cách làm việc với người dùng (Bình)

- Trả lời bằng **tiếng Việt**. Giao diện web cũng tiếng Việt.
- **Không viết comment trong code.**
- Đưa **file đầy đủ** (hoặc file nén các file đã đổi, đặt đúng đường dẫn trong repo), không đưa đoạn rời.
- **Sửa tối thiểu, giữ cấu trúc code hiện có.** Không tự thay đổi ngoài yêu cầu.
- Sau mỗi phần việc viết **commit message theo Conventional Commits**, tiếng Anh, có scope.
- Khi báo cáo PDF xuất ra **khác** file mẫu của sếp, nói ngay.
- Chẩn đoán nguyên nhân gốc trước khi sửa, không thử sai.
- Người dùng thường bảo "khoan code, đợi tôi chốt" khi cần quyết định: đề xuất phương án rồi chờ, không tự code.
- Chỉ hỏi khi thật sự bị chặn.

## 2. Dự án là gì

Website khảo sát ESG miễn phí cho doanh nghiệp. Doanh nghiệp điền thông tin, trả lời bộ câu hỏi, rồi xuất **báo cáo PDF** giống file mẫu của sếp. Monorepo pnpm:

- `apps/web`: Next.js (App Router, Turbopack), Tailwind v4, @react-pdf/renderer, zod 4.
- `packages/shared` (`@esg/shared`): kiểu dữ liệu, quy tắc câu trả lời, `buildReportModel`, test bằng `tsx --test`.
- `apps/api`: **chưa tạo**, đã thay bằng Google Sheet + Apps Script.

Không còn mock data và không còn bộ câu hỏi do admin nhập trong web. `/admin` được ẩn nhưng giữ code.

## 3. Nguồn dữ liệu: Google Sheet

- Bộ câu hỏi đọc từ Sheet qua `https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&headers=0&sheet=<tên tab>`, dùng fetch của Next với `revalidate` = `SURVEY_REVALIDATE_SECONDS` (mặc định 300 giây). Sheet chia sẻ "anyone with the link".
- Các tab (theo ghi nhận trong phiên, cần kiểm tra lại với Sheet): `01 Hồ sơ` (P-001…P-025), `02` câu hỏi chung, `03`–`10` câu theo ngành, `11` mức Cơ bản/Mở rộng theo quy mô nhân sự, `12` logic, `13`–`14` quy tắc câu trả lời.
- Chỉ hiển thị câu hỏi có trạng thái **"Đã duyệt"**.
- Chọn bộ câu: theo ngành (`MAN`, `RET`, `SER`, `ICT`, `CON`, `AGR`, `EDU`, `OTH` ứng với sản xuất, thương mại, dịch vụ, CNTT, xây dựng, nông nghiệp, giáo dục, đặc thù) và theo quy mô (dưới 50 người = Cơ bản, từ 50 = Mở rộng).
- Nhóm câu hỏi: mỗi chủ đề một nhóm, tab theo ngành gắn nhãn ngành. Người dùng **không muốn sửa cấu trúc Sheet**, nên mọi thay đổi nằm trong code.
- Cột Sheet mà code dùng cho báo cáo: `input_type` (loại câu), `improvementHint` (gợi ý cải thiện), chủ đề (`topic`). Tên cột chính xác: cần kiểm tra trong `apps/web/src/server/survey-bank/build-survey-bank.ts`.

## 4. Lưu doanh nghiệp: Apps Script

- Form thông tin doanh nghiệp (gồm trường của web và của Sheet "Data khách hàng") gửi đến `POST /api/company`, rồi sang Apps Script web app.
- Apps Script: ghi/cập nhật theo cột "Mã báo cáo" (upsert, có khóa LockService), logo lưu vào thư mục con của từng báo cáo trong Drive (thư mục gốc id `1t67dZNkMMejzQzF29ZMIIjQDvT-Crsir`).
- Biến môi trường (chỉ tên, giá trị không đưa vào tài liệu): `GOOGLE_SHEET_QUESTIONS_ID`, `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_SECRET`, `SURVEY_REVALIDATE_SECONDS`. Bí mật cũng nằm trong Script Properties của Apps Script. Biến mới thêm sau này xem mục 12.
- Biến tùy chọn để trống được hiểu là chưa đặt.
- Tài liệu: `docs/apps-script/Code.gs`, `docs/huong-dan-cai-dat-apps-script.md`, `docs/huong-dan-quan-tri-bo-cau-hoi.md`. `docs/backend-spec.md` là tài liệu cũ về backend Express, **đã lỗi thời**.
- Lưu doanh nghiệp xảy ra khi bấm "Lưu thông tin doanh nghiệp" và cả khi bấm xuất báo cáo. Nút lưu doanh nghiệp cũng ghi bản nháp trình duyệt.

## 5. Mô hình câu trả lời

Theo `input_type`:

| Loại                                                 | Lựa chọn                                             |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `PRACTICE`                                           | Có / Có một phần / Chưa có / Chưa rõ / Không áp dụng |
| `NUMBER`, `INTEGER`, `FUEL_TABLE`, `WORKFORCE_TABLE` | 3 lựa chọn (đã có, chưa có dữ liệu, không áp dụng)   |
| `TEXT`                                               | Văn bản                                              |
| `INCIDENT`                                           | Có/Không sự cố                                       |
| `PRESENCE`                                           | Có/Không sự hiện diện                                |

Quy tắc nằm ở `packages/shared/src/answer-rules.ts` (`getAnswerFields`, `getAnswerIssues`). Mỗi câu có ghi chú tùy chọn và phần bằng chứng (tối đa 10 tệp PDF/ảnh, mỗi tệp 10 MB). Tệp bằng chứng **không** lưu trong bản nháp.

## 6. Bản nháp và trình duyệt

- Bản nháp: `localStorage` (câu trả lời, thông tin doanh nghiệp, nhóm đang làm; phiên bản 2). Mã báo cáo lưu riêng.
- Kế hoạch cải thiện ESG lưu riêng ở khóa `esg-improvement-plan-v1` (module `plan-storage.ts`), xóa khi "Làm báo cáo mới".
- Tự lưu khi hoàn thành một nhóm; có nút "Lưu bản nháp"; cảnh báo khi rời trang.

## 7. Báo cáo PDF

Quy trình: `buildReportModel` (hàm thuần, trong `@esg/shared/src/report-model.ts`) tạo model → `ReportDocument` (`apps/web/src/features/survey/report/report-document.tsx`) dựng PDF bằng @react-pdf, **hai lượt** để có số trang mục lục. Ảnh minh chứng được thu nhỏ bằng canvas. Phông DejaVu Sans ở `apps/web/public/fonts`. Câu chữ diễn giải sinh theo quy tắc, **không dùng AI**. Câu chữ cố định nằm ở `report/copy.ts`.

File mẫu của sếp (bản đối chiếu): `ESG_Mau_to_vang_Do_hoa_v3.md` (mẫu, 39 trang, có biến `{{...}}`) và `THEGIOIROBOT_Demo_ESG_Do_hoa_v3.md` (bản điền demo). Các biến vàng là mã đổ dữ liệu, gắn theo **mã câu hỏi hoặc mã trường**, không gắn số dòng Sheet. Biến không có nguồn thì **ẩn**, không dùng số demo. Xem `docs/doi-chieu-bien-mau-nguon-du-lieu.md`.

Quyết định đã chốt:

- Trang bìa nền trắng, kiểu cơ bản/hiện đại, không dùng màu xanh.
- Bỏ chữ "BẢN NHÁP" khỏi header từng trang; trên web có giải thích vì sao là bản nháp và liên kết nhảy tới câu C-060.
- Danh sách hiển thị **đầy đủ**, không rút gọn "và N nội dung khác" (ngoại lệ có chủ ý: 3 ưu tiên, 3 trọng tâm).
- Mỗi nội dung "cần làm rõ" dùng chữ dễ hiểu.

### 7.1 Khoảng trống và ưu tiên (mục R06)

- Khoảng trống: câu `INCIDENT` trả lời Có; `PRACTICE` trả lời Chưa có / Có một phần / Chưa rõ; câu số liệu/bảng/văn bản trả lời "Chưa có dữ liệu". Không tính "Không áp dụng" và câu chưa trả lời.
- Xếp hạng 0–4 theo loại trên; mỗi nhóm câu một dòng, cột "Căn cứ" nêu tên cụ thể từng nội dung theo loại.
- **Gợi ý ưu tiên** (hệ thống gợi ý, không phải lựa chọn của người có thẩm quyền): sự cố/Chưa có → Cao; Có một phần → Trung bình; Chưa rõ/Chưa có dữ liệu → Cần làm rõ trước. Nhóm lấy mức cao nhất.
- Biểu đồ "theo chủ đề": đếm số câu có khoảng trống theo cột chủ đề của Sheet. Tạm giữ nguyên, có thể giới hạn hoặc gom lại sau.

### 7.2 Kế hoạch hành động

- Theo sếp (05/11): thêm mục tùy chọn "Kế hoạch cải thiện ESG" ở bước rà soát. Mỗi đầu việc có công việc, người/bộ phận phụ trách, hạn, trạng thái (Chưa bắt đầu / Đang thực hiện / Hoàn thành / Tạm hoãn). Có thêm kết quả mong muốn, nguồn lực, chu kỳ xem xét. Không bắt khách điền hết.
- Đã làm: thẻ nhập `improvement-plan-card.tsx` ngay trên hai nút xuất; nút "Thêm từ đề xuất"; hình tiến độ sinh từ đầu việc (xếp theo hạn, mỗi hàng 5 bước, màu theo trạng thái).
- Không có kế hoạch: ẩn phần kế hoạch, chỉ còn "Đề xuất cải thiện chưa được doanh nghiệp xác nhận" nếu có gợi ý. Cả hai đều không có thì ẩn trang.
- Kế hoạch **chưa** lưu lên Sheet. Hook xuất/xem trước chưa truyền kế hoạch trực tiếp; `createReportBlob` đọc kế hoạch từ localStorage.

### 7.3 Minh chứng và phụ lục

- Mục "Hình ảnh và minh chứng chọn lọc" nhóm ảnh theo **câu hỏi**: mã và tên câu, nội dung câu, ghi chú chung của câu (một lần), ảnh kèm mã `EV-xxx` và tên tệp, tệp không phải ảnh liệt kê bằng chữ. Tối đa 8 ảnh.
- Phụ lục câu trả lời là bảng 4 cột (Mã câu, Câu hỏi, Câu trả lời, Trạng thái căn cứ), tiêu đề lặp lại ở mỗi trang.
- Phần Scope 1/2 có ghi chú giải thích: do doanh nghiệp tự khai, báo cáo không tự tính.

### 7.4 Bẫy kỹ thuật react-pdf đã gặp

- `lineHeight` không đơn vị ở Page hoặc phần fixed gây lỗi "unsupported number" hoặc chữ chồng đè.
- `minPresenceAhead` chỉ nhìn các phần tử anh em; tiêu đề phải là con phẳng của Page.
- Khối `wrap={false}` quá dài làm chữ tràn và đè chân trang: cho phép ngắt trang với khối dài (`Panel breakable`, `DataTable splitRows`).
- Tiêu đề bảng lặp lại dùng `fixed` đã thử được.

## 8. Việc đang hoãn, chờ xác nhận hoặc chưa làm

- Đổi từ "khoảng trống" sang chữ dễ hiểu hơn (đề xuất "Nội dung cần bổ sung" hoặc "cần bổ sung hoặc làm rõ"); người dùng chưa chốt từ nào và chưa chốt có rà soát toàn bộ file không.
- Lưu kế hoạch lên Sheet: chưa cần.
- Ánh xạ câu hỏi → trang báo cáo đang nằm trong code (`SECTION_IDS`); chuyển vào cột Sheet là việc lớn, để sau.
- Ảnh và icon trang trí như mẫu: để sau.
- Biểu đồ/bảng điện theo tháng và Scope 1/2 chi tiết: chưa có câu hỏi tương ứng trong Sheet. Cần thêm câu hỏi vào Sheet và mở rộng model.
- Các biến "Chưa có nguồn" và "Cần kiểm tra" trong file đối chiếu biến: chờ sếp xác nhận.
- Chấm điểm theo nhóm: chưa làm.
- Cần chạy `pnpm typecheck`, `pnpm --filter web lint` và test của `packages/shared` sau mỗi phần; từ phần kế hoạch cải thiện trở đi, mới xác nhận typecheck, chưa xác nhận lint và test.

## 9. Lệnh thường dùng

- `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`
- Test shared: chạy trong `packages/shared` (`tsx --test`), file `tests/report-model.test.ts`.

## 10. Quy ước code

- TypeScript nghiêm ngặt, không `any`; dữ liệu ngoài phải qua Zod.
- Tổ chức theo tính năng; kiểu và schema dùng chung đặt ở `@esg/shared`.
- Màu và bo góc dùng token trong `apps/web/src/app/globals.css`.
- Component UI dùng từ `@/components/ui`; chú ý `Select` bắt buộc có prop `placeholder`.
- Giao diện tiếng Việt, không nhãn "miễn phí".

## 11. Cách bắt đầu phiên mới

1. Gắn repo (hoặc gửi file nén repo, không kèm `node_modules`, `.next`, `.env`).
2. Gửi kèm file mẫu của sếp (hai file .md và các file Word nếu cần).
3. Nói rõ việc cần làm; nếu là việc hoãn ở mục 8, nói "chốt" kèm quyết định.

## 12. Cập nhật 08/11/2026: Về ESG Report Online, trang quản trị, Tư vấn, SEO

Phần này do các phiên làm giao diện (frontend) bổ sung. Quy trình làm việc của phiên đó: Claude làm trong bản sao cloud, gửi **file nén các file đã đổi** đặt đúng đường dẫn repo; Bình giải nén đè lên `D:\workspace\esg-website`, rồi Claude hướng dẫn cài đặt và test từng bước chi tiết (kèm commit message). Bình tự commit và push (bản cloud không phải git repo, không có remote). Test của Claude dùng Playwright, và một "bridge giả lập" chạy đúng `Code.gs` (chỉ có trong môi trường Claude, không nằm trong repo); môi trường Claude không truy cập được Google, nên mọi thứ liên quan Google chỉ test được trên bản giả lập.

### 12.1 Header, Tư vấn, góp ý, trang "đang cập nhật"

- `apps/web/src/components/layout/site-header.tsx`: thứ tự Tạo báo cáo, Hướng dẫn (liên kết `#`, giữ chỗ), Giải pháp cân bằng carbon (Trồng rừng, Mua tín chỉ carbon), Về ESG Report Online, Tư vấn. Gạch chân mục đang mở. Footer chưa đổi. Thanh chọn ngôn ngữ VI/EN/ZH/FR hiện **chỉ là giao diện, chưa có chức năng**.
- Tư vấn: menu "Tư vấn" và "Kiểm định độc lập" mở hộp thoại điền thông tin; gửi đến `/api/contact` rồi sang Apps Script (tên route chính xác: cần kiểm tra trong code). Ghi vào tab `Tiếp nhận tư vấn & kiểm định độc lập` (khớp cột theo tên cột, trạng thái "Mới tiếp nhận") và gửi email thông báo `NOTIFY_EMAIL`.
- Góp ý dưới nút tạo báo cáo: ghi vào tab `Góp ý` (tự tạo). Nếu khách để email, trigger hằng ngày `sendFeedbackInvites` gửi email xin góp ý sau `FEEDBACK_DELAY_DAYS` ngày (mặc định 5; đặt 0 thì email đi vào lần chạy trigger kế tiếp, không gửi tức thì). Cài trigger bằng `installFeedbackTrigger`.
- `/trong-rung` và `/mua-tin-chi-carbon`: giao diện mờ kèm hộp "Tính năng đang cập nhật", đặt `noindex`.

### 12.2 Trang công khai "Về ESG Report Online"

- Tuyến: `/ve-esg-report-online` (Thành tựu, có dải số liệu), `/ve-esg-report-online/tin-tuc`, `/ve-esg-report-online/[section]/[slug]` (`section` là `thanh-tuu` hoặc `tin-tuc`).
- Mã: `apps/web/src/features/about/` (components, lib/content.ts, lib/related.ts, lib/seo.ts, hooks/use-likes.ts, data/sample-\*.ts).
- Đọc dữ liệu: `lib/content.ts` (server-only) lấy bài và số liệu từ Apps Script, lưu đệm 60 giây trong bộ nhớ (`globalThis`). **Chưa cấu hình Apps Script thì hiện dữ liệu mẫu** (đánh dấu `isSample`, `noindex`); đã cấu hình thì chỉ hiện dữ liệu thật (chưa có bài thì báo trống, chưa có số liệu thì ẩn dải số liệu).
- Bài viết liên quan: cùng chuyên mục trước, mới nhất trước, bài ngắn 2 bài, bài dài (trên khoảng 3.000 ký tự dữ liệu) 3 bài, thiếu thì lấy thêm bài mục cùng loại.
- Thả tim (lưu `localStorage` + đếm trên Sheet, không chống trùng theo người), chia sẻ (Facebook, Zalo, LinkedIn, X) và sao chép liên kết. Liên kết chia sẻ Zalo chưa kiểm chứng. **Bình luận chưa làm** (bản mẫu thiết kế có khung bình luận; Bình chọn bỏ lúc đầu).
- Loading: `loading.tsx` cho các tuyến public và quản trị; component `Skeleton`, `LoadingRegion` trong `@/components/ui`; `Modal` có prop `dismissible`.

### 12.3 Trang quản trị `/quan-tri`

- Đăng nhập bằng **một mật khẩu chung** ở biến `ADMIN_PASSWORD` (từ 8 ký tự); phiên lưu cookie `esg-admin` (httpOnly, ký HMAC bằng `ADMIN_SESSION_SECRET`, nếu thiếu thì dùng `ADMIN_PASSWORD`; 7 ngày); sai quá 5 lần trong 15 phút thì khóa tạm theo IP. Chưa đặt `ADMIN_PASSWORD` thì trang báo chưa cấu hình.
- Chức năng: danh sách bài, đăng, lưu nháp, sửa, xóa (hộp thoại xác nhận có trạng thái chờ), sửa dải số liệu thành tựu (tối đa 8 mục) ở `/quan-tri/so-lieu`. Trang đặt `noindex`.
- Mã: `apps/web/src/features/about-admin/` (components, lib), `apps/web/src/app/quan-tri/`, API `apps/web/src/app/api/admin/{login,logout,posts,posts/[id],stats,upload}` và `api/likes`; lớp máy chủ `apps/web/src/server/about/bridge.ts`, `server/admin/`.
- Trình soạn bài: TipTap (giống Google Docs): tiêu đề lớn/nhỏ, in đậm/nghiêng/gạch chân, liên kết, căn lề, danh sách, trích dẫn, đường kẻ, **bảng**, ảnh (dán, kéo thả, chọn tệp; căn trái/giữa/phải, cỡ 25–100%, mô tả ảnh, chú thích). Chưa có: màu chữ, cỡ chữ, chữ bao quanh ảnh, nhúng video.
- Ảnh bìa: hộp chỉnh ảnh (kéo, phóng to 100–400%, xoay, cắt 16:9, xuất 1600x900 JPEG); vùng tối cho biết phần bị cắt ở đầu trang bài (tỉ lệ 2,7:1).
- Chưa làm: sửa nội dung cố định của trang (tiêu đề lớn, đoạn giới thiệu, banner) từ trang quản trị; ô "Tiêu đề SEO" và "Mô tả SEO" riêng cho bài.

### 12.4 Định dạng nội dung và lưu trữ

- Nội dung bài (`body`) là JSON dạng ProseMirror. Bộ lọc an toàn và kiểu nằm ở `packages/shared/src/rich-text.ts` (`sanitizeRichDoc`: chỉ giữ node, mark và thuộc tính được phép, chặn đường dẫn ảnh không phải https, đường dẫn liên kết lạ). Bài cũ (khối đoạn/tiêu đề/khung nổi bật) tự chuyển sang định dạng mới khi đọc. Schema nhập: `packages/shared/src/about.ts` (`postInputSchema`, `statsInputSchema`, `likeInputSchema`).
- Giới hạn: khoảng 400.000 ký tự dữ liệu, 1.000 khối. Nội dung trên 40.000 ký tự được chia mảnh vào tab `Nội dung bài viết`; cột `Nội dung (JSON)` ghi `@chunks:N`. Hiển thị công khai bằng component riêng `features/about/components/rich-content.tsx`, **không dùng HTML thô**; kiểu chữ dùng chung ở lớp `.rich-content` trong `globals.css`.
- Mỗi lần mở trang tin, web đọc cả nội dung các bài (lưu đệm 60 giây): nếu có hàng trăm bài dài thì nên tách danh sách và nội dung.

### 12.5 Apps Script cho phần này

- File `docs/apps-script/Code.gs`. Khi sửa: dán lại toàn bộ, rồi Triển khai > Quản lý bản triển khai > bút chì > **Phiên bản mới** (không tạo bản triển khai mới vì URL sẽ đổi).
- Script Properties: `SECRET`, `FOLDER_ID`, `NOTIFY_EMAIL`, `SITE_URL` (tùy chọn). Giá trị không ghi vào tài liệu.
- Tab tự tạo: `Bài viết`, `Số liệu thành tựu`, `Nội dung bài viết`, `Góp ý`. Hành động: `savePost`, `deletePost`, `saveStats`, `likePost`, `listPosts`, `listStats`, `uploadImage`. Ghi dữ liệu dùng khóa.
- Ảnh nằm ở thư mục Drive con `Ảnh trang Về ESG Report Online` trong thư mục `FOLDER_ID`, chia sẻ "ai có liên kết đều xem được"; địa chỉ dạng `https://lh3.googleusercontent.com/d/<id>=w1600`. Xóa bài, đổi ảnh bìa hoặc xóa ảnh khỏi bài thì ảnh không còn bài nào dùng (kể cả nháp) được chuyển vào Thùng rác của Drive (khôi phục được 30 ngày). Ảnh tải lên nhưng chưa từng được lưu vào bài không bị dọn tự động.
- Tài liệu hướng dẫn cài đặt đầy đủ: `docs/huong-dan-cai-dat-apps-script.md` (có mục 9 về trang Về/quản trị, mục 10 về SEO).

### 12.6 SEO

- Địa chỉ website: biến **`NEXT_PUBLIC_SITE_URL`** (không có dấu `/` cuối) trong `apps/web/.env.local` và trên Vercel; thiếu thì dùng `VERCEL_PROJECT_PRODUCTION_URL` hoặc `http://localhost:3000`.
- Mã: `src/lib/site.ts` (hằng số, `getSiteUrl`, `absoluteUrl`, `truncateText`), `src/lib/seo.ts` (`pageMetadata`, `breadcrumbJsonLd`, `NO_INDEX`), `src/components/seo/json-ld.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `features/about/lib/seo.ts`. Ảnh chia sẻ mặc định `public/og-default.png` (1200x630).
- Tiêu đề trang theo mẫu `%s | ESG Report Online`. Mỗi bài có tiêu đề, mô tả (tóm tắt cắt 160 ký tự), canonical, thẻ chia sẻ và JSON-LD Article + BreadcrumbList. Sitemap động theo bài đã đăng (không nháp, không bài mẫu). Robots chặn `/quan-tri`, `/api/`, `/cong-cu-ai`.

### 12.7 Lưu ý khi làm đa ngôn ngữ (VI, EN, ZH, FR)

- Toàn bộ chữ giao diện đang viết thẳng bằng tiếng Việt trong component (header, footer, trang Về, trang quản trị, hộp Tư vấn, thông báo lỗi trong `@esg/shared`, bộ câu hỏi từ Sheet, báo cáo PDF).
- Bài viết và số liệu trên Sheet chưa có cột ngôn ngữ; slug và canonical chưa có tiền tố ngôn ngữ; sitemap và robots chưa có `hreflang`.
- Phông: layout gốc nạp Noto Sans (latin, vietnamese) và Noto Sans SC chỉ bộ `latin`, nên tiếng Trung cần nạp thêm bộ chữ phù hợp; phông DejaVu Sans của báo cáo PDF **không có chữ Hán**.
- Ba trang trong `app/(public)/` (trang chủ, các trang Về) đều là `force-dynamic`; chọn cách chia tuyến (tiền tố `/en`) hay cookie sẽ ảnh hưởng SEO và sitemap.
