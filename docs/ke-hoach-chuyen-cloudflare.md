# Kế hoạch chuyển toàn bộ sang Cloudflare (20/11/2026)

Trạng thái: **mới là kế hoạch, chưa có dòng code nào.** Bình đã chốt hướng chung (mục 1) nhưng còn vài điểm cần chốt trước khi code (mục 2). Tài liệu này để một phiên làm việc mới đọc là làm được. Đọc cùng [boi-canh-du-an.md](boi-canh-du-an.md) (cách làm việc với Bình ở mục 1, bản đồ hiện trạng ở mục 4, 12, 13), [huong-dan-cai-dat-apps-script.md](huong-dan-cai-dat-apps-script.md), [da-ngon-ngu.md](da-ngon-ngu.md) và [ke-hoach-luu-bao-cao-va-xac-thuc-email.md](ke-hoach-luu-bao-cao-va-xac-thuc-email.md).

## 1. Yêu cầu đã chốt (Bình, 20/11/2026)

- Muốn deploy fullstack trên Cloudflare: frontend, backend, database, gửi mail, lưu file/ảnh.
- Chấp nhận **build lại toàn bộ** phần backend (Google Sheet + Apps Script + Drive hiện nay).
- Chấp nhận trả gói **Workers Paid 5 USD/tháng**. Có thể người khác sẽ trả tiền thay Bình về sau (xem mục 8).
- Muốn **tạm ngưng khi vượt hạn mức** để không bị trừ thêm tiền (xem mục 6: làm được một phần, phải bổ sung giới hạn trong code).
- Cần duy trì mọi tính năng hiện có (mục 4), không làm mất dữ liệu cũ.

## 2. Việc cần Bình chốt trước khi code

Phiên mới **không tự code**, hỏi Bình các điểm này (dùng AskUserQuestion) rồi mới làm:

1. **Có tách backend riêng không?** Next.js chạy trên Workers (OpenNext) có thể dùng D1, R2, KV trực tiếp trong route handler. Đề xuất: giai đoạn đầu **không tách**, viết lớp truy cập dữ liệu trong `apps/web/src/server/` (chỗ đang gọi Apps Script) rồi chuyển dần; chỉ tách Worker API riêng (Hono) nếu cần. Bình từng nói "nestjs": repo **chưa từng có** NestJS (`apps/api` chưa tạo). Việc NestJS chạy được trên Workers **chưa xác nhận**, Cloudflare chỉ có ví dụ chính thức cho Express và Koa qua `node:http`. Nếu muốn backend riêng, đề xuất Hono.
2. **Bộ câu hỏi giữ ở Google Sheet hay chuyển?** Hiện bộ câu hỏi là Sheet công khai đọc qua gviz CSV (miễn phí, không cần khóa) và những người quản lý bộ câu hỏi đang sửa trực tiếp trên Sheet; Bình **không muốn sửa cấu trúc Sheet** (boi-canh mục 3). Đề xuất: **giữ Sheet cho bộ câu hỏi** ở giai đoạn đầu, chuyển D1 chỉ phần dữ liệu do web ghi. Chuyển bộ câu hỏi sang D1 kéo theo phải làm trang quản trị bộ câu hỏi (việc lớn).
3. **Gửi mail:** Email Service cần gói Paid và domain; hay dùng dịch vụ ngoài có gói miễn phí? Quyết định sau khi kiểm tra yêu cầu domain (mục 9).
4. **Domain:** đã có domain chưa, ai giữ? Cần đưa DNS về Cloudflare để dùng Email Service và Turnstile thuận tiện.
5. **Dịch tự động:** hiện dùng `LanguageApp.translate` của Apps Script (miễn phí, rất tiện). Rời Apps Script thì mất cái này. Chọn: giữ một Apps Script **chỉ để dịch**, hay dùng dịch vụ khác (Gemini đã có khóa, Workers AI), hay dịch trước khi build như chữ cố định.
6. **Dữ liệu cũ:** chuyển hết (Sheet, Drive) sang D1/R2 hay chỉ giữ lưu trữ và bắt đầu mới?
7. **Trang quản trị xem dữ liệu:** thay thế việc xem Sheet. Làm trong `/quan-tri` (đã có đăng nhập một mật khẩu chung) hay chỉ dùng công cụ xem D1 của Cloudflare.

## 3. Hiện trạng phụ thuộc vào Google (đã đọc repo 20/11/2026)

### 3.1 Apps Script (`docs/apps-script/Code.gs`, 2.104 dòng) dùng làm gì

| Nhóm | Hành động (`doPost`) | Lưu ở đâu | Ghi chú |
| --- | --- | --- | --- |
| Doanh nghiệp | `saveCompany` | Tab `Data khách hàng` (upsert theo cột "Mã báo cáo", **khớp cột theo tên**, cột thừa bị bỏ qua) + logo vào Drive `FOLDER_ID/<mã báo cáo>` | `Data khách hàng` còn có cột "Email đã xác thực" |
| Tư vấn, góp ý | `saveInquiry`, `saveFeedback` | Tab `Tiếp nhận tư vấn & kiểm định độc lập`, `Góp ý` | Gửi mail cho `NOTIFY_EMAIL`; trigger `sendFeedbackInvites` hằng ngày gửi mail xin góp ý sau `FEEDBACK_DELAY_DAYS` (mặc định 5) |
| Trang Về, tin tức | `listPosts`, `savePost`, `deletePost`, `likePost`, `listStats`, `saveStats`, `uploadImage` | Tab `Bài viết`, `Số liệu thành tựu`, `Nội dung bài viết` (nội dung JSON ProseMirror chia mảnh 40.000 ký tự) + ảnh trong Drive `Ảnh trang Về ESG Report Online` | Xóa bài/đổi ảnh thì ảnh không còn dùng được đưa vào thùng rác |
| Dịch | `translate`, `listTranslations`, `saveTranslations`, `pruneTranslations` | Tab `Bản dịch` (cột `en/fr/zh` tự động + `en/fr/zh (sửa tay)`) | `LanguageApp.translate`; trigger `installTranslationTriggers` gọi `GET /api/cron/translations` của web |
| Lưu báo cáo | `uploadReportChunk`, `finishReport` | Drive `Báo cáo đã xuất/<mã báo cáo>/<mã lần xuất>/` (PDF + Word) + tab `Báo cáo đã xuất`, `Nội dung khảo sát` | Chia mảnh 2.499.999 byte vì giới hạn body Vercel; giữ 5 lần xuất mới nhất mỗi mã |
| OTP, tài khoản | `otpRequest`, `otpVerify`, `setReportOwner`, `listOwnerReports`, `getOwnerReportFile`, `getOwnerSnapshot`, `deleteOwnerReport` | `CacheService` (mã OTP băm HMAC), cột `Email đã xác thực` | Trần 60 OTP/ngày vì hạn mức Gmail; Next ký cookie `esg-user` bằng `USER_SESSION_SECRET` |
| Dọn dẹp | trigger `cleanupReportUploads` (cả `cleanupReportOrphans_`) | | Dọn tệp tạm quá 24 giờ và dòng `Nội dung khảo sát` mồ côi |

### 3.2 Phía Next.js (`apps/web`)

- Bộ câu hỏi: `server/survey-bank/get-survey-bank.ts` + `server/google-sheets/fetch-sheet-tab.ts` (fetch `gviz` với `next: { revalidate }`, `SURVEY_REVALIDATE_SECONDS`).
- Cầu nối Apps Script: `server/about/bridge.ts` (`callAbout`), `server/company/save-company.ts`, `server/contact/submit-contact.ts`, `server/reports/archive.ts`, `server/my-reports/owner.ts`, `server/auth/email-otp.ts`, `server/translation/*`. Đây là **điểm thay thế**: giữ nguyên giao diện hàm (tên, kiểu trả về) và đổi phần bên trong.
- Route handler `app/api/*`: `admin/{login,logout,posts,stats,translations,upload}`, `ai-data/run`, `auth/{email,logout,me}`, `brand-theme/analyze`, `company`, `contact`, `cron/translations`, `likes`, `my-reports/*`, `reports/{attach,finish,upload}`. Hầu hết khai báo `export const runtime = "nodejs"` và `dynamic = "force-dynamic"`.
- `proxy.ts` (Next 16, thay middleware): chọn ngôn ngữ theo quốc gia, đã đọc `x-vercel-ip-country` **hoặc** `cf-ipcountry`.
- Giới hạn tần suất: `server/brand-theme/limits.ts` (`createRateWindow`) và `server/auth/limits.ts`, `server/my-reports/limits.ts`, `server/reports/limits.ts` **lưu trong bộ nhớ tiến trình** (`Map`). Trên Workers mỗi isolate có bộ nhớ riêng và bị thu hồi bất kỳ lúc nào, nên **cách này không còn đúng**. Phải thay (mục 5).
- Cache bộ nhớ trong `globalThis`: `server/translation/memory.ts`, `translate-texts.ts` (`__esgTranslationState`), `server/about/*` (đệm 60 giây). Chỉ còn là tối ưu cục bộ trên Workers, không đáng tin.
- `after` từ `next/server` dùng để dịch nền trong `translate-texts.ts`. Trên Workers phải dùng cơ chế tương đương (`waitUntil`); cần kiểm tra OpenNext có map `after` không.
- `node:crypto` (`timingSafeEqual`, HMAC), `Buffer`, `unpdf` (đọc PDF cho công cụ AI), `fetch` tới Gemini: cần `nodejs_compat`. Công cụ AI (`ENABLE_AI_TOOLS`, `ENABLE_BRAND_THEME`) mặc định tắt trên production.
- Phông và logo ở `apps/web/public` (6,7 MB phông) là tài nguyên tĩnh, tải từ trình duyệt, **không tính vào dung lượng Worker**.

### 3.3 Phát hiện quan trọng: PDF và Word dựng ở trình duyệt

Báo cáo PDF (`@react-pdf/renderer`) và Word (`docx`) được dựng **trong trình duyệt** (`features/survey/report/generate-report.tsx`, `generate-docx.ts`). Máy chủ chỉ nhận file đã dựng để lưu. Vì vậy rủi ro "react-pdf chạy được trên Workers hay không" mà trước đây từng nêu **gần như không còn**: Workers chỉ cần nhận, lưu R2, và trả file. Lưu ý lại nếu sau này chuyển việc dựng PDF sang phía máy chủ.

Hệ quả tốt: bỏ được việc chia mảnh 2,5 MB và `uploadReportChunk` nếu body request lên Workers đủ lớn (**giới hạn kích thước body của Workers chưa kiểm tra**; hoặc dùng URL ký sẵn để tải thẳng lên R2).

## 4. Phạm vi: tính năng phải giữ nguyên hành vi

- Khảo sát: bộ câu hỏi theo ngành và quy mô, bản nháp `localStorage`, kế hoạch cải thiện, xuất PDF/Word (tại trình duyệt).
- Lưu doanh nghiệp (`/api/company`), upload logo, upsert theo mã báo cáo `ESG-YYYYMMDD-XXXX`.
- Lưu báo cáo đã xuất tự động, OTP email, `/bao-cao-cua-toi` (danh sách, tải, mở lại, xóa), giữ 5 lần xuất mỗi mã, dọn dữ liệu mồ côi.
- Tư vấn, kiểm định độc lập, góp ý, mail thông báo, mail xin góp ý sau N ngày.
- Trang Về ESG Report Online: bài viết, số liệu, thả tim, ảnh, trang quản trị `/quan-tri` (mật khẩu chung, TipTap).
- Đa ngôn ngữ vi/en/fr/zh, bộ nhớ bản dịch có cột sửa tay thắng bản tự động.
- SEO (sitemap, robots, hreflang, JSON-LD), thương hiệu báo cáo (tùy chọn, Gemini).

## 5. Ánh xạ Google → Cloudflare (đề xuất)

| Hiện nay | Cloudflare | Ghi chú |
| --- | --- | --- |
| Vercel (Next.js) | Workers + `@opennextjs/cloudflare` | Next 16 được hỗ trợ; `proxy.ts` (middleware Node) mới ở mức **experimental** (từ 1.20.3). Windows không được đảm bảo: dùng WSL hoặc CI |
| Google Sheet (dữ liệu web ghi) | **D1** (SQLite) | Dùng Drizzle ORM (đúng kế hoạch `apps/api` cũ). Lược đồ cố định thay cho "khớp cột theo tên" |
| Google Drive (PDF, Word, logo, ảnh bài viết) | **R2** | Không phí egress. Ảnh công khai qua domain riêng hoặc Worker; báo cáo để riêng tư, tải qua Worker sau khi kiểm chủ sở hữu |
| `CacheService` (OTP) | KV (có TTL) hoặc D1 + dọn hạn | OTP cần đếm lần thử chính xác: KV là nhất quán cuối cùng, **cần cân nhắc** (D1 hoặc Durable Object chính xác hơn) |
| `MailApp` | Cloudflare Email Service (gửi), hoặc dịch vụ khác | Gửi tới địa chỉ bất kỳ cần Workers Paid; 3.000 mail/tháng miễn phí kèm gói, sau đó 0,35 USD/1.000 mail |
| `LockService` | Giao dịch D1 / `INSERT ... ON CONFLICT` | Upsert theo mã báo cáo làm bằng ràng buộc duy nhất |
| Trigger Apps Script | **Cron Triggers** của Workers | Dọn tệp tạm, dọn mồ côi, giữ 5 lần xuất, gửi mail xin góp ý, dịch nền |
| Rate limit trong RAM | Workers Rate Limiting binding / KV / D1 / Turnstile | Chọn cách ở giai đoạn thử. Bắt buộc có vì không còn chốt chặn Gmail 100 mail/ngày |
| `LanguageApp.translate` | Chưa chọn (mục 2, điểm 5) | |
| Biến môi trường Vercel | Secrets và vars của Workers (`wrangler`) | `CRON_SECRET` không cần nếu dùng Cron Triggers nội bộ |

Lược đồ D1 sơ bộ (chốt sau): `companies` (cột lấy từ `packages/shared/src/company.ts` và tab `Data khách hàng` hiện có), `inquiries`, `feedback`, `posts`, `post_stats`, `post_likes`, `translations`, `report_exports` (kèm khóa R2 PDF/Word, email chủ sở hữu), `report_snapshots` (JSON, không cần chia mảnh nếu vừa giới hạn kích thước dòng của D1: **giới hạn chưa kiểm tra**; có thể đẩy JSON sang R2), `otp_attempts` (nếu dùng D1).

## 6. Chi phí, hạn mức, tạm ngưng khi vượt hạn mức (đã kiểm tra trang tài liệu 20/11/2026)

**Workers Paid (5 USD/tháng, tối thiểu mỗi tài khoản):**
- Workers: 10 triệu request và 30 triệu ms CPU mỗi tháng đã gồm; vượt thì 0,30 USD mỗi triệu request, 0,02 USD mỗi triệu ms CPU. Request file tĩnh miễn phí. Không phí egress. CPU mỗi lần gọi: tối đa 5 phút, mặc định 30 giây.
- D1: 25 tỷ dòng đọc, 50 triệu dòng ghi, 5 GB mỗi tháng đã gồm; vượt thì 0,001 USD mỗi triệu dòng đọc, 1,00 USD mỗi triệu dòng ghi, 0,75 USD/GB-tháng.
- KV: 10 triệu lượt đọc, 1 triệu ghi/xóa/liệt kê mỗi tháng đã gồm, 1 GB lưu trữ.
- **R2 không nằm trong gói 5 USD**, tính riêng: miễn phí 10 GB-tháng, 1 triệu thao tác ghi (loại A), 10 triệu thao tác đọc (loại B); vượt thì 0,015 USD/GB-tháng.
- Email Service: gửi cho địa chỉ bất kỳ cần Workers Paid; 3.000 mail/tháng đã gồm, vượt 0,35 USD/1.000 mail; gửi tới địa chỉ đã xác minh thì miễn phí và không tính hạn mức.
- Gói Free: hết hạn mức ngày (100.000 request/ngày, D1 5 triệu dòng đọc và 100.000 dòng ghi/ngày) thì request bị từ chối đến 00:00 UTC; CPU 10 ms mỗi lần gọi; Worker tối đa 3 MiB nén. Gói Paid nâng giới hạn kích thước Worker (**con số chưa kiểm tra**).

**Tạm ngưng khi vượt hạn mức:**
- **Spending limit** (Billing > Spend Management) chỉ áp dụng cho **Workers và Durable Objects**. Khi chi phí chạm ngưỡng, Cloudflare chặn lời gọi mới đến kỳ thanh toán sau hoặc đến khi đổi ngưỡng. **Không bao gồm** KV, R2, Workers AI; tài liệu không liệt kê D1 và Email Service.
- **Không phải trần cứng:** tài liệu ghi limit "does not guarantee a maximum invoice amount" (độ trễ đo lường). Phí gói 5 USD không tính vào ngưỡng. Limit tạo trên dashboard **không có người nhận email**, muốn nhận thông báo phải thêm `notification_email` bằng CLI. Có thể chặn cả những app khác dùng chung sản phẩm trong tài khoản.
- **Budget alerts** chỉ báo email (Manage Account > Billing > Billable Usage > Create budget alert), không ngưng gì, áp dụng cho chi phí theo mức dùng gộp toàn tài khoản.
- Vì vậy phải có giới hạn **trong code**: rate limit theo IP và theo email, trần gửi mail mỗi ngày, trần dung lượng upload, Turnstile cho OTP và form công khai, và trần số request ghi vào D1/R2 theo ngày nếu cần. Đặt spending limit khoảng 10 đến 20 USD và bật budget alert.

## 7. Giai đoạn đề xuất

Mỗi giai đoạn kết thúc bằng: test chạy, `pnpm build` qua, ghi nhật ký vào tài liệu này, giao file nén các file đã đổi kèm commit message và hướng dẫn Bình test. Chạy **song song** với Apps Script cho tới khi cắt chuyển; không tắt Apps Script trước GĐ7.

- **GĐ0, nhánh thử nghiệm (không đụng dữ liệu thật):** build bằng OpenNext, chạy `wrangler dev`/preview; kiểm tra `proxy.ts`, `after`, `nodejs_compat` với `node:crypto`/`Buffer`, các route `runtime = "nodejs"`, fetch có `revalidate` (bộ nhớ đệm OpenNext cần binding R2/KV, **cần kiểm tra**), kích thước bundle, tải file lớn qua Worker, phông CJK, SEO/sitemap. Kết quả ghi vào mục "Nhật ký". Dừng và báo Bình nếu có chỗ không chạy.
- **GĐ1, hạ tầng:** tài khoản Cloudflare (ai trả tiền: mục 8), Workers Paid, spending limit và budget alert, domain, `wrangler.jsonc`, môi trường staging/production, secrets, CI. Chuyển lưu logo, ảnh bài viết, báo cáo sang **R2** (lớp `server/storage`).
- **GĐ2, D1 và lớp dữ liệu:** lược đồ Drizzle, migration, thay `callAbout`/`save-company`/`submit-contact`/`archive` bằng lớp dữ liệu D1, giữ nguyên hàm công khai. Khóa duy nhất cho upsert. Dọn mồ côi và giữ 5 lần xuất bằng Cron Triggers.
- **GĐ3, OTP, phiên và mail:** OTP, cookie `esg-user` (giữ nguyên cách ký), gửi mail (OTP, thông báo tư vấn, xin góp ý), Turnstile, trần mail mỗi ngày, cấu hình SPF/DKIM.
- **GĐ4, bài viết, số liệu, thả tim, trang quản trị**, ảnh trên R2.
- **GĐ5, dịch và i18n:** theo quyết định ở mục 2 điểm 5; `pnpm i18n:sync` hiện cần Apps Script khi dev/build.
- **GĐ6, chuyển dữ liệu cũ:** script xuất Sheet và Drive sang D1 và R2 (nếu Bình chọn chuyển), kiểm đếm số dòng/tệp, đối chiếu.
- **GĐ7, cắt chuyển:** chuyển DNS, theo dõi, tắt trigger và web app Apps Script khi ổn định; lưu Sheet cũ làm bản sao lưu.

## 8. Việc Bình phải tự làm (Claude không làm được)

- Tạo tài khoản Cloudflare, thêm phương thức thanh toán, mua Workers Paid. Về chuyển người trả tiền: tài liệu Cloudflare nêu được cách **thêm và đổi Super Administrator** (một Super Admin có email đã xác minh thêm người mới, gán vai trò Super Admin, rồi gỡ người cũ). Việc đổi thẻ thanh toán sang người khác **chưa được xác nhận**, cần xem trong Billing. Tốt nhất để người sẽ trả tiền tạo tài khoản ngay từ đầu.
- Đặt spending limit, budget alert (và `notification_email` bằng CLI).
- Đưa domain về Cloudflare, cấu hình DNS, SPF/DKIM cho mail.
- Giữ Apps Script chạy song song trong lúc chuyển.

## 9. Điều chưa xác minh (phải kiểm tra, đừng giả định)

- NestJS chạy trên Workers (chỉ có ví dụ Express/Koa; chưa thấy Fastify/NestJS).
- Email Service có đang ở giai đoạn thử nghiệm công khai không (một trang changelog ghi "public beta", trang giá không nói), yêu cầu xác minh domain gửi, giới hạn kích thước/số người nhận.
- Giới hạn kích thước Worker của gói Paid; giới hạn kích thước body request; kích thước dòng và JSON của D1.
- OpenNext có hỗ trợ `after` và `proxy.ts` ổn định chưa; `export const runtime = "nodejs"` hoạt động ra sao; bộ nhớ đệm cho `fetch` có `revalidate`.
- KV có đủ chính xác cho đếm OTP và rate limit không (nhất quán cuối cùng).
- Đổi phương thức thanh toán sang người khác.
- Spending limit có áp dụng cho D1, R2, Email Service không.

## 10. Quy ước dự án vẫn phải giữ

- Cách làm việc với Bình: tiếng Việt, không comment trong code, file đầy đủ, sửa tối thiểu giữ cấu trúc, commit Conventional Commit tiếng Anh có scope, giao file nén đúng đường dẫn repo rồi hướng dẫn cài đặt và test, "khoan code, đợi tôi chốt" khi cần quyết định, chẩn đoán nguyên nhân gốc, không đổi ngoài yêu cầu (boi-canh mục 1).
- Chỗ nào lưu dữ liệu (D1, R2, KV) phải có cơ chế **dọn dữ liệu mồ côi**.
- Mọi chuỗi giao diện đi qua `t()`/`msg()`, đủ en/fr/zh, chạy `pnpm --filter web i18n:check` (mục 9 của [da-ngon-ngu.md](da-ngon-ngu.md)).
- TypeScript nghiêm ngặt, không `any`, dữ liệu ngoài qua Zod; kiểu dùng chung đặt ở `@esg/shared`.
- Không đưa khóa và giá trị bí mật vào tài liệu hay git.
- Cập nhật tài liệu sau mỗi giai đoạn (tài liệu này, `boi-canh-du-an.md`, `README.md`, hướng dẫn cài đặt) để phiên sau đọc là hiểu. `docs/backend-spec.md` là tài liệu **cũ** về backend Express, đã lỗi thời.
- Trước khi viết code Next.js, đọc hướng dẫn trong `node_modules/next/dist/docs/` (xem `apps/web/AGENTS.md`).
- Môi trường Claude không truy cập được Google hay Cloudflare thật: chỉ kiểm thử được bằng bản giả lập (Miniflare/`wrangler dev` cục bộ, nếu cài được). Nói rõ phần nào chưa kiểm chứng.

## 11. Nhật ký

- 20/11/2026: Viết kế hoạch này. Chưa code. Đã kiểm tra tài liệu giá của Workers, D1, Email Service, Spend Management, Budget alerts và cách đổi Super Administrator (nguồn ở mục 12).

## 12. Nguồn đã đọc (20/11/2026)

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/email-service/platform/pricing/
- https://developers.cloudflare.com/billing/manage/spend-management/
- https://developers.cloudflare.com/billing/manage/budget-alerts/
- https://developers.cloudflare.com/fundamentals/subscriptions-and-billing/change-super-admin
- https://blog.cloudflare.com/bringing-node-js-http-servers-to-cloudflare-workers/
