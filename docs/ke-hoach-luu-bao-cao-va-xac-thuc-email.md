# Kế hoạch tính năng: lưu báo cáo đã xuất và xem lại bằng email OTP (16/11/2026)

Trạng thái (19/11/2026): GĐ1, GĐ2, GĐ3 và GĐ4 đã làm xong (chỉ còn các việc tùy chọn ở cuối GĐ4 và việc Bình thử thật trên Google/Vercel). Mục 4 đã được Bình chốt ngày 17/11. Mục 7 là bản đồ mã nguồn để làm tiếp. Đọc cùng `boi-canh-du-an.md` (mục 4, 6, 7, 12.5) và `huong-dan-cai-dat-apps-script.md`.

## 1. Yêu cầu đã chốt

- Trong hộp thoại hiện ra sau khi bấm "Tạo báo cáo" (`report-download-dialog.tsx`) thêm phần **không bắt buộc** để user nhập email và xác thực bằng mã OTP gửi về email. User mở mail lấy mã và điền vào web.
- **Bỏ SMS** (không có dịch vụ SMS miễn phí). Chỉ dùng email.
- **Luôn lưu báo cáo** user đã xuất, kể cả khi user không nhập email. Hiện web chưa lưu file báo cáo.
- Mỗi lần lưu gồm: file PDF, file Word, câu trả lời (kèm ghi chú), thông tin doanh nghiệp (hồ sơ), kế hoạch cải thiện ESG và theme thương hiệu. **Không lưu** ảnh và tệp minh chứng (đúng như bản nháp hiện tại).
- Dữ liệu lưu vào Google Sheet và Drive mà web đang dùng (qua Apps Script hiện có).
- Trang mới "Báo cáo của tôi": đăng nhập bằng OTP email, xem danh sách báo cáo, tải lại PDF/Word, nạp lại câu trả lời vào khảo sát để làm tiếp.
- Mục đích thứ hai: cung cấp dữ liệu (email, báo cáo, câu trả lời) cho web.

## 2. Hiện trạng liên quan (đã đọc)

- `use-report-export.ts`: `exportReport` kiểm tra, lưu doanh nghiệp (`saveCompany`, upsert theo mã báo cáo `ESG-YYYYMMDD-XXXX`), rồi mở hộp thoại. `downloadReport(format)` dựng PDF hoặc Word **trong trình duyệt** rồi tải về, không gửi đi đâu.
- `Code.gs` (1.186 dòng): `doPost` điều phối theo `action`; đã có `saveCompany_` (logo vào thư mục con Drive theo mã báo cáo), `ensureTable_`/`readTable_` (tab tự tạo), cơ chế chia mảnh nội dung dài (`storeBody_`, ô tối đa 40.000 ký tự), `MailApp.sendEmail`, khóa `LockService`, `trashUnusedImages_`.
- Next gọi Apps Script qua `server/*/bridge` với `GOOGLE_APPS_SCRIPT_URL` và `GOOGLE_APPS_SCRIPT_SECRET`. Phiên quản trị dùng cookie httpOnly ký HMAC (`server/admin/session.ts`): mẫu để làm phiên người dùng.
- Bản nháp: `toDraftContent`, `restoreDraft` (`draft-state.ts`), localStorage `esg-studio:draft` phiên bản 2; kế hoạch `esg-improvement-plan-v1`; theme `esg-brand-theme-v1`.

## 3. Thiết kế

### 3.1 Lưu báo cáo (không phụ thuộc email)
- Khi user bấm "Tạo báo cáo" và đã qua kiểm tra, trình duyệt dựng **cả PDF và Word** rồi gửi lên **trong lúc nút đang ở trạng thái loading** ("Đang tạo báo cáo..."), sau đó mới mở hộp thoại tải. File vừa dựng được giữ trong bộ nhớ nên bấm tải là có ngay. Dùng đúng dữ liệu và ngôn ngữ hiện tại. **Người dùng không được thấy chữ "đã lưu vào hệ thống"** (quyết định 18/11): lưu lỗi thì im lặng, hộp thoại vẫn mở và vẫn tải được; lần bấm "Tạo báo cáo" sau sẽ lưu lại.
- Vì body route Vercel giới hạn khoảng 4,5 MB mà PDF có ảnh minh chứng có thể lớn hơn, file được **chia mảnh** (khoảng 2,5 MB nhị phân mỗi mảnh) gửi qua `POST /api/reports/upload`. Apps Script ghép lại và ghi vào Drive. Cơ chế ghép: mỗi mảnh là một tệp tạm trong thư mục tạm của Drive, bước kết thúc ghép base64 và tạo file; tệp tạm bị xóa ngay, và có trigger dọn tệp tạm quá 24 giờ.
- Drive: `<thư mục cha của FOLDER_ID> / Báo cáo đã xuất / <mã báo cáo> / <exportId> /` chứa 1 PDF + 1 Word. `FOLDER_ID` là thư mục **logo khách hàng** (`saveCompany_`), nên `Báo cáo đã xuất` được đặt **ngang cấp** với nó (quyết định 19/11, sau khi bản 18/11 đặt bên trong thư mục logo). Tùy chọn `REPORTS_FOLDER_ID` để chỉ định nơi khác; thư mục cũ bên trong thư mục logo tự được chuyển ra (`reportsRootFolder_`); không tạo được ở cấp cha thì rơi về bên trong thư mục logo. Tên file `<exportId>_<tên theo buildReportFileName>`. Dọn bản cũ: trash cả thư mục exportId (chỉ khi thư mục cha của file tên đúng exportId; export cũ dạng phẳng chỉ trash file, không bao giờ trash thư mục mã báo cáo). Lỗi khi ghi: trash thư mục exportId vừa tạo.
- Sheet (cùng bảng tính đang dùng), tab tự tạo:
  - `Báo cáo đã xuất`: Mã lần xuất, Mã báo cáo, Thời gian, Ngôn ngữ, Trạng thái (Bản nháp / Đầy đủ), Tên doanh nghiệp, Giao diện (mặc định / thương hiệu), Id file PDF, Id file Word, Email đã xác thực (trống nếu chưa).
  - `Nội dung khảo sát`: Mã lần xuất, ảnh chụp dữ liệu dạng JSON (doanh nghiệp, câu trả lời và ghi chú, kế hoạch, theme, nhóm đang làm, phiên bản định dạng), chia mảnh theo cùng cách `Nội dung bài viết`.
- Tab "Data khách hàng" giữ nguyên; thêm cột "Email đã xác thực" (khớp theo tên cột như hiện tại, thiếu cột thì bỏ qua) để người quản lý thấy liên hệ ngay ở bảng đang dùng.
- Phiên bản: mỗi lần xuất tạo một "lần xuất" mới cho cùng mã báo cáo; giữ tối đa 5 lần gần nhất, lần cũ hơn bị xóa kèm file Drive (quy ước dọn dữ liệu mồ côi).

### 3.2 Xác thực email (OTP)
- Apps Script giữ trạng thái OTP bằng `CacheService` (tự hết hạn, không để lại dữ liệu mồ côi): khóa là mã băm của email, giá trị là mã băm HMAC của OTP, số lần thử, thời điểm gửi.
- Quy tắc: mã 6 chữ số, hiệu lực 10 phút, tối đa 5 lần nhập sai (sau đó hủy mã), chờ 60 giây mới gửi lại, tối đa 3 mã mỗi email mỗi giờ, trần theo IP ở Next, trần gửi mỗi ngày cho cả hệ thống để không cạn hạn mức email.
- Hành động mới: `otpRequest` (nhận email, tiêu đề và nội dung đã dịch từ Next, sinh mã, lưu băm, gửi `MailApp`), `otpVerify` (so mã, trả ok). Nội dung email do Next dựng theo ngôn ngữ đang xem (vi, en, fr, zh) để Apps Script chỉ việc gửi.
- Next: `POST /api/auth/email/request`, `POST /api/auth/email/verify`, `POST /api/auth/logout`. Verify thành công thì đặt cookie `esg-user` (httpOnly, ký HMAC bằng `USER_SESSION_SECRET`, 30 ngày), rồi gắn email vào các lần xuất của **mã báo cáo hiện tại** (`attachOwner`).
- Email nhập nhưng chưa xác thực thì **không lưu** làm chủ sở hữu.
- Giao diện hộp thoại: mục "Lưu để xem lại sau (không bắt buộc)": ô email, nút "Gửi mã", ô 6 số, nút "Xác nhận", đếm ngược gửi lại, trạng thái "Đã liên kết email ...". Không chặn nút tải.

### 3.3 Trang "Báo cáo của tôi"
- Tuyến `/bao-cao-cua-toi` (có tiền tố ngôn ngữ như các trang public), `noindex`, không vào sitemap, thêm vào `robots.ts`. Link ở header (đã dịch).
- Chưa đăng nhập: form email, OTP. Đã đăng nhập: danh sách báo cáo theo email (nhóm theo mã báo cáo, hiện các lần xuất), nút tải PDF, tải Word, "Mở lại để chỉnh sửa", "Xóa", "Đăng xuất".
- Tải file: `GET /api/my-reports/[id]/file?format=pdf|docx`, kiểm tra cookie và chủ sở hữu rồi lấy file từ Apps Script và trả về (stream để không dính giới hạn 4,5 MB). Drive giữ riêng tư, **không** mở chia sẻ công khai.
- Mở lại để chỉnh sửa: lấy ảnh chụp dữ liệu, ghi vào localStorage (bản nháp, kế hoạch, theme, mã báo cáo) rồi chuyển về trang khảo sát; dùng `restoreDraft` nên câu hỏi Sheet đổi thì tự khớp theo mã câu hỏi. Ảnh minh chứng không có, cần tải lại nếu muốn.
- Xóa: xóa các hàng Sheet và file Drive của lần xuất (hoặc cả mã báo cáo).

### 3.4 An toàn và quyền riêng tư
- Chống lạm dụng gửi mail tới địa chỉ lạ: giới hạn như mục 3.2; có thể thêm captcha (Cloudflare Turnstile miễn phí) nếu bị lạm dụng.
- Chống truy cập chéo (IDOR): mọi API đọc dữ liệu phải kiểm tra email trong cookie khớp chủ sở hữu của lần xuất; id lần xuất ngẫu nhiên và khó đoán.
- Mã OTP và email không ghi vào log.
- Cần thêm dòng giải thích ngắn trong hộp thoại và ghi vào chính sách quyền riêng tư: báo cáo và dữ liệu được lưu để xem lại; email dùng để xác thực và liên hệ.
- Hạn mức email: `MailApp` giới hạn khoảng 100 người nhận mỗi ngày với Gmail thường, khoảng 1.500 với Google Workspace; hạn mức này dùng chung với email Tư vấn và Góp ý.

## 4. Điểm mặc định (Bình đã chốt ngày 17/11/2026: chấp nhận toàn bộ)

| # | Câu hỏi | Mặc định đề xuất |
| --- | --- | --- |
| 1 | Lưu lúc nào | Tự lưu trong lúc loading của nút "Tạo báo cáo" (trước khi hộp thoại mở), không cần bấm tải |
| 2 | Số lần xuất giữ lại cho mỗi mã báo cáo | 5 lần gần nhất, cũ hơn tự xóa |
| 3 | Báo cáo "Bản nháp" (thiếu dữ liệu) | Vẫn lưu, ghi trạng thái "Bản nháp" |
| 4 | OTP | 6 số, hiệu lực 10 phút, 5 lần thử, gửi lại sau 60 giây, phiên 30 ngày |
| 5 | Tài khoản gửi mail | Tài khoản Google đang chạy Apps Script. **Đã chốt: Gmail thường** (khoảng 100 người nhận mỗi ngày, dùng chung với Tư vấn, Góp ý, email mời đánh giá), nên đặt trần 60 mã OTP mỗi ngày cho cả hệ thống |
| 6 | Captcha | Chưa dùng, thêm nếu bị lạm dụng |
| 7 | Email đã xác thực ở thiết bị khác | Ở thiết bị nào cũng nhập email, nhận mã, điền mã là xem được **mọi** báo cáo gắn email đó. Báo cáo xuất trước khi xác thực chỉ gắn được cho lần xuất đang mở trong hộp thoại |

## 5. Các giai đoạn

### GĐ1 - Lưu báo cáo ẩn danh (nền móng)
**Việc**: Apps Script thêm `beginUpload`, `appendChunk`, `finishReport` (ghép mảnh, ghi Drive vào thư mục báo cáo, ghi hai tab mới), cột "Email đã xác thực" tùy chọn, giữ tối đa N lần xuất và dọn tệp tạm; Next thêm `server/reports/*`, `POST /api/reports/upload` (chia mảnh, kiểm tra kích thước và loại tệp bằng chữ ký byte, kiểm tra mã báo cáo), schema zod trong `@esg/shared` (`report-archive.ts`: ảnh chụp dữ liệu, bản ghi lần xuất); client `features/survey/lib/report-archive.ts` và hook `useReportArchive` gọi khi hộp thoại mở; hộp thoại hiện trạng thái lưu; thông báo lỗi bằng `msg(...)`, chữ giao diện `t(...)`.
**Đầu ra**: mỗi lần mở hộp thoại tải, Sheet có hàng mới, Drive có PDF và Word, ảnh chụp dữ liệu được ghi đầy đủ.
**Test**: test đơn vị cho schema, chia và ghép mảnh, bỏ ảnh minh chứng khỏi ảnh chụp; chạy với bridge giả mô phỏng `Code.gs` (tệp lớn hơn 4,5 MB, mảnh bị mất, gửi lặp, lỗi giữa chừng, vượt 5 lần xuất); Bình dán `Code.gs`, tạo Phiên bản mới, xuất thật và kiểm tra Drive và Sheet.

**Nhật ký GĐ1 (đã làm xong, đã kiểm thử bằng bridge giả)**:
- Hai route thay vì một: `POST /api/reports/upload` (multipart, từng mảnh) và `POST /api/reports/finish` (JSON, ghép và ghi Sheet/Drive). Mảnh 2.499.999 byte (chia hết cho 3 nên base64 từng mảnh nối được), tối đa 12 mảnh, mỗi file tối đa 25 MB, snapshot tối đa 600.000 ký tự.
- Apps Script: hành động `uploadReportChunk`, `finishReport`; tab `Báo cáo đã xuất`, `Nội dung khảo sát`; thư mục Drive `Tải lên tạm`; giữ 5 lần xuất mới nhất cho mỗi mã báo cáo, bản cũ bị xóa cả file Drive lẫn hàng snapshot; lỗi ghi Sheet thì hoàn tác (xóa snapshot, bỏ file vừa tạo); trigger hằng ngày `installReportCleanupTrigger` dọn mảnh tạm quá 24 giờ.
- Web: `useReportExport` lưu tự động trong lúc loading của nút "Tạo báo cáo" (chống lưu trùng theo khóa nội dung). Bản đầu có dòng trạng thái "Đang lưu / Đã lưu / Thử lại" trong hộp thoại; ngày 18/11 đã **bỏ** theo yêu cầu của Bình, lưu lỗi thì im lặng và vẫn tải được file.
- Sửa 18/11: tab `Báo cáo đã xuất` có thêm hai cột `Link file PDF` và `Link file Word` (văn bản "Mở PDF" / "Mở Word" có gắn liên kết tới file trong Drive, chỉ chủ Drive mở được). **Bẫy đã gặp (18/11):** bản đầu dùng công thức `=HYPERLINK(url, nhãn)` qua `setFormula`, nhưng Sheet đặt ngôn ngữ Việt dùng dấu `;` ngăn cách đối số nên ô báo `#ERROR!`; đã đổi sang giá trị rich text (`newRichTextValue().setLinkUrl(...)`), không phụ thuộc ngôn ngữ của Sheet. Ô đang lỗi được ghi đè ở lần xuất kế tiếp hoặc khi chạy `backfillReportLinks`. Dòng cũ chưa có link được tự ghi bù ở lần xuất sau, hoặc chạy hàm `backfillReportLinks` trong Apps Script.
- `callAbout` thêm tham số timeout; test web dùng shim `tests/setup/server-only.cjs`.
- Kiểm thử: shared 70 pass, web 26 pass, bridge Apps Script giả 16/16, typecheck và `i18n:check` sạch. Chưa thử được Google/Vercel thật và `pnpm build`.

### GĐ2 - Xác thực email OTP
**Việc**: Apps Script `otpRequest`, `otpVerify`, `attachOwner` (gắn email vào các lần xuất của mã báo cáo, và vào cột "Email đã xác thực" ở Data khách hàng); Next `server/auth/*` (cookie phiên ký HMAC theo mẫu `server/admin/session.ts`, giới hạn theo IP, dựng email theo ngôn ngữ), 3 route auth, biến `USER_SESSION_SECRET`; mục OTP trong hộp thoại tải; trạng thái liên kết lưu cho phiên.
**Đầu ra**: nhập email, nhận mã, xác nhận, hàng của báo cáo hiện tại có email chủ sở hữu.
**Test**: test đơn vị cho ký và kiểm tra cookie, quy tắc hạn mức, hết hạn, sai quá 5 lần, gửi lại; bridge giả; email thật trên máy Bình (kiểm tra hộp thư rác, 4 ngôn ngữ, hạn mức `getRemainingDailyQuota`).

**Nhật ký GĐ2 (đã làm xong 18/11/2026, kiểm thử bằng bridge giả; chưa thử email thật)**

Luồng người dùng:
1. Bấm "Tạo báo cáo": loading, báo cáo được lưu ẩn danh, hộp thoại mở.
2. Trong hộp thoại có khung "Xem lại báo cáo sau (không bắt buộc)": nhập email, "Gửi mã", nhập 6 số, "Xác nhận". Khung này không chặn việc tải.
3. Xác nhận xong, web đặt cookie phiên và **liên kết lần xuất đang mở** với email (cột `Email đã xác thực` của tab `Báo cáo đã xuất`, và cột cùng tên ở `Data khách hàng` nếu bảng có cột đó).
4. Từ lúc có cookie, mọi lần xuất mới tự mang email chủ sở hữu ngay khi lưu. Nút "Dùng email khác" chỉ **đăng xuất trình duyệt này** (xóa cookie); không có bảng người dùng nên không xóa gì ở Sheet hay Drive. Dữ liệu đã gắn email cũ giữ nguyên và vẫn thuộc email cũ. Nếu xác nhận email khác ngay trong hộp thoại, lần xuất đang mở đã thuộc email cũ nên không bị ghi đè (Apps Script trả `conflict`); web tự **tạo một lần xuất mới** thuộc email mới (hàm `linkReportOwner`). Hai email cùng dùng một mã báo cáo thì chia chung mức giữ 5 lần xuất của mã đó.

Quy tắc OTP (hằng số `EMAIL_OTP_RULES` trong `packages/shared/src/auth.ts` và các biến `OTP_*` đầu `Code.gs`, phải giữ khớp nhau): mã 6 số, hiệu lực 10 phút, tối đa 5 lần nhập sai (sai lần 5 thì hủy mã), gửi lại sau 60 giây, tối đa 3 mã mỗi giờ cho mỗi email, tối đa 60 mã mỗi ngày cho cả hệ thống (đếm trong Script Property `OTP_DAY`, giờ Việt Nam) và dừng nếu hạn mức Gmail còn dưới 10 (`OTP_MIN_MAIL_QUOTA`); ở Next có thêm trần theo IP (6 lần xin mã và 20 lần xác nhận mỗi 10 phút, tính trong bộ nhớ từng instance).

Thiết kế đã chọn và lý do:
- **Trạng thái OTP nằm ở `CacheService` của Apps Script** (tự hết hạn, không để dữ liệu mồ côi). Khóa là HMAC của email, giá trị là HMAC của `mã:khóa` (không lưu mã gốc, không lưu email gốc). Hạn chế: CacheService là best-effort, nếu bị đẩy khỏi bộ nhớ thì mã báo "hết hạn" và user xin mã mới.
- **Apps Script sinh mã và gửi mail**; Next chỉ gửi tiêu đề và nội dung mẫu có chỗ `{code}` theo ngôn ngữ (4 ngôn ngữ nằm cứng trong `server/auth/otp-mail.ts`, không qua `t()`, vì là email do máy chủ dựng). Email chỉ chứa mã, không có đường dẫn.
- Kết quả bình thường (hết hạn, sai mã, vượt hạn mức) trả về `ok: true` kèm `status` để Next ánh xạ sang mã HTTP và thông báo; chỉ lỗi thật mới `ok: false`.
- **Cookie `esg-user`**: httpOnly, `sameSite=lax`, `secure` ở production, 30 ngày, nội dung `{email, hạn}` ký HMAC-SHA256 bằng `USER_SESSION_SECRET` (tối thiểu 32 ký tự). Thiếu biến này thì mọi route OTP trả 503 và giao diện báo chưa bật; lưu báo cáo ẩn danh vẫn chạy.
- **Liên kết lần xuất đã lưu bằng `attachToken`**: vì lúc lưu chưa biết email, route `finish` trả thêm `attachToken` = HMAC(`attach:mãLầnXuất:thờiĐiểm`), hiệu lực 6 giờ. Route `POST /api/reports/attach` cần **cả** cookie phiên và token đúng của lần xuất đó, email lấy từ cookie (không bao giờ lấy từ body). Nhờ vậy không ai gắn được báo cáo của người khác chỉ bằng cách đoán mã lần xuất. Apps Script `setReportOwner` chỉ ghi khi ô email còn trống; email khác thì trả `conflict` (409), không ghi đè.
- Email chủ sở hữu lúc `finishReport` do **Next** truyền (đọc từ cookie), client không gửi được.
- `Data khách hàng`: cột `Email đã xác thực` là tùy chọn, thiếu cột thì bỏ qua; có nhiều email cho một mã báo cáo thì giữ email mới nhất.

Tệp chính (xem mục 7): `packages/shared/src/auth.ts`; `server/auth/*`; `app/api/auth/{email/request,email/verify,me,logout}`; `app/api/reports/attach`; `features/account/*`; sửa `report-download-dialog.tsx`, `use-report-export.ts`, `server/reports/archive.ts`, `app/api/reports/finish/route.ts`, `server/env.ts`, `Code.gs`.

Kiểm thử đã chạy: `@esg/shared` 76 pass; web 47 pass (ký và kiểm tra cookie, token liên kết, 7 route, giới hạn IP, ánh xạ trạng thái, chống cookie giả); bridge Apps Script giả 18 + 16 pass (OTP 12 ca, link, email chủ sở hữu); một lượt end-to-end route Next tới `Code.gs` thật qua bridge giả (xin mã, sai mã, xác nhận, liên kết, lần xuất sau tự mang email, đăng xuất); xem giao diện bằng trình duyệt thật (5 trạng thái, thu hẹp 520 px); `typecheck` ba package, `eslint` 0 lỗi, `i18n:check` đủ 3 ngôn ngữ.

Chưa kiểm thử được (cần Bình làm trên máy mình): gửi email thật qua `MailApp`, hộp thư rác, 4 ngôn ngữ của email, `CacheService` thật, cookie `secure` trên Vercel, `pnpm build`.

Việc cần làm khi triển khai: đặt `USER_SESSION_SECRET` ở web (Vercel và `.env.local`); dán lại `Code.gs` và tạo Phiên bản mới (lần đầu có `MailApp` thì có thể phải cấp lại quyền); tùy chọn thêm cột `Email đã xác thực` vào tab `Data khách hàng`.

### GĐ3 - Trang "Báo cáo của tôi"
**Việc**: tuyến `/bao-cao-cua-toi` kèm `loading.tsx`, form đăng nhập OTP dùng lại thành phần của GĐ2, danh sách, `GET /api/my-reports`, `GET /api/my-reports/[id]/file` (stream, kiểm tra chủ sở hữu), "Mở lại để chỉnh sửa" (ghi localStorage rồi chuyển về `/`), "Xóa" và "Đăng xuất"; link ở header và menu di động; `noindex`, `robots.ts`; chữ giao diện qua `t(...)`.
**Đầu ra**: đăng nhập bằng OTP, xem, tải, mở lại, xóa báo cáo cũ.
**Test**: truy cập chéo (báo cáo của email khác phải bị từ chối), cookie hết hạn hoặc bị sửa, tải file lớn, mở lại rồi xuất tiếp (tạo lần xuất mới), `/en`, `/fr`, `/zh`, màn hình hẹp.

**Nhật ký GĐ3 (đã làm xong 19/11/2026, kiểm thử bằng bridge giả và trình duyệt thật; chưa thử Google/Vercel thật)**

Luồng người dùng: header (và menu di động) có link "Báo cáo của tôi" tới `/bao-cao-cua-toi` (có tiền tố ngôn ngữ). Chưa đăng nhập thì thấy form email + OTP (cùng `EmailOtpForm`, prop `required` đổi tiêu đề thành "Xác nhận email để xem báo cáo", bỏ chữ "không bắt buộc"). Đã đăng nhập: danh sách nhóm theo mã báo cáo (tên doanh nghiệp, mã, các lần xuất mới nhất trước, nhãn Đầy đủ/Bản nháp, ngôn ngữ), mỗi lần xuất có **Tải PDF**, **Tải Word**, **Mở lại để chỉnh sửa**, **Xóa**; nút **Đăng xuất** ở đầu trang (chỉ xóa cookie, như mục GĐ2).

Quyết định thiết kế:
- Email **luôn lấy từ cookie** (`readSessionEmail()`), không route nào nhận email từ client. Apps Script kiểm chủ sở hữu **lần nữa** ở cả 4 hành động mới (`findOwnedExport_` so cột `Email đã xác thực`), nên lộ mã lần xuất cũng không đọc được báo cáo người khác. Báo cáo ẩn danh (chưa gắn email) không ai xem/xóa được qua trang này.
- Apps Script thêm `listOwnerReports` (không trả id file Drive), `getOwnerReportFile` (trả base64 từng mảnh 2.499.999 byte, kèm `total`, `size`, `name`), `getOwnerSnapshot` (ghép các ô 40.000 ký tự), `deleteOwnerReport`. Trạng thái bình thường trả `ok: true` kèm `status` (`ok`, `missing`, `range`, `deleted`); id sai định dạng, định dạng lạ, chỉ số mảnh sai thì `ok: false`.
- Tải file: `GET /api/my-reports/[id]/file?format=pdf|docx` mở mảnh đầu để biết kích thước, rồi **stream** các mảnh còn lại (`ReadableStream`, mỗi mảnh một lần gọi Apps Script) với `Content-Length`, `Content-Disposition` (có `filename*` UTF-8), `Cache-Control: private, no-store`, `nosniff`. Client tải bằng `fetch` rồi `downloadBlob` để lỗi 401/404 hiện thành thông báo thay vì tải về một tệp JSON.
- Mở lại để chỉnh sửa: `GET /api/my-reports/[id]/snapshot` (kiểm tra bằng `reportSnapshotSchema`, 422 nếu hỏng), client gọi `applyReportSnapshot` (`features/survey/lib/apply-snapshot.ts`) ghi localStorage: bản nháp (`esg-studio:draft`), kế hoạch, theme (xóa nếu mặc định) và mã báo cáo (`esg-studio:report-code`), rồi chuyển về `/`. Khảo sát nạp lại bằng `restoreDraft` nên câu hỏi Sheet đổi thì khớp theo mã câu hỏi. Có hộp xác nhận vì bản nháp hiện có trên trình duyệt bị thay. Xuất tiếp sẽ tạo lần xuất **mới** cho cùng mã báo cáo (chưa ghi đè lần cũ).
- Xóa: `DELETE /api/my-reports/[id]` -> `deleteOwnerReport`: đưa file PDF/Word và thư mục `RX-…` vào Thùng rác, thư mục mã báo cáo trong `Báo cáo đã xuất` cũng vào Thùng rác nếu rỗng, xóa các hàng `Nội dung khảo sát` và hàng `Báo cáo đã xuất`. **Không** đụng thư mục logo theo mã báo cáo ở gốc, và **không** xóa email ở `Data khách hàng` (đó là dữ liệu liên hệ của doanh nghiệp, không thuộc lần xuất).
- Giới hạn tốc độ (bộ nhớ từng instance): đọc 60 lần/IP/10 phút, xóa 20 lần/IP/10 phút, 5.000 lần/ngày cho cả hệ thống (`server/my-reports/limits.ts`). Toàn bộ phản hồi `private, no-store`.
- Trang `noindex`, `Disallow` trong `robots.ts` (`/bao-cao-cua-toi` và bản có tiền tố ngôn ngữ), không vào sitemap. Đã thu hẹp khoảng cách menu để thêm link không làm header cao hơn ở màn 900 px trở lên.

Việc cần làm khi triển khai: chỉ cần dán lại `Code.gs` và tạo Phiên bản mới (có 4 hành động mới). Không có biến môi trường mới.

Kiểm thử đã chạy: `@esg/shared` 78 pass; web 64 pass (13 test mới cho 4 route: 401 khi thiếu hoặc giả cookie, email lấy từ cookie, id/định dạng sai không gọi Apps Script, stream đúng thứ tự mảnh và header, 404, 422, giới hạn xóa theo IP); bridge Apps Script giả 42 pass (8 test mới: chỉ liệt kê đúng email và không lộ id Drive, tải đúng từng byte kể cả file hơn 2,5 MB chia 3 mảnh, từ chối email khác ở cả file/snapshot/xóa, id/định dạng/chỉ số sai, ghép snapshot, xóa dọn đủ thư mục, giữ thư mục khi còn lần xuất khác, file bị xóa ngoài hệ thống báo `missing`); typecheck, eslint 0 lỗi, `i18n:check` đủ (27 chuỗi mới, 3 ngôn ngữ). Chạy trang thật bằng trình duyệt với Apps Script giả: đăng nhập OTP, danh sách, tải PDF và Word đúng chữ ký, mở lại (ghi đúng localStorage), xóa, đăng xuất, màn 390 px.

Chưa kiểm thử được (cần Bình thử thật): Drive/Sheet thật, giới hạn thời gian 6 phút và tốc độ của Apps Script với file lớn, stream trên Vercel, xóa vào Thùng rác Drive thật.

### GĐ4 - Hoàn thiện và bàn giao
**Việc**: dọn dữ liệu mồ côi hoàn chỉnh (xóa báo cáo xóa luôn file Drive, hàng Sheet, mảnh nội dung; trigger dọn tệp tạm bỏ dở), `i18n:sync` rồi commit `src/i18n/messages/`, cập nhật `huong-dan-cai-dat-apps-script.md` (mục mới: dán lại `Code.gs`, Phiên bản mới, quyền Drive/Mail, cài trigger dọn), README (biến `USER_SESSION_SECRET`), `da-ngon-ngu.md`, dòng quyền riêng tư; chạy `pnpm typecheck`, `pnpm lint`, test `@esg/shared` và web, `i18n:check`; danh sách kiểm thử thủ công.
**Nhật ký GĐ4 (đã làm xong 19/11/2026, kiểm thử bằng bridge giả; chưa thử Google/Vercel thật)**
- Thư mục báo cáo đặt ngang cấp thư mục logo (mục 3.1), tự chuyển thư mục cũ, `REPORTS_FOLDER_ID` tùy chọn.
- Dọn mồ côi: trigger hằng ngày `cleanupReportUploads` thêm `cleanupReportOrphans_` (xóa dòng `Nội dung khảo sát` không còn dòng `Báo cáo đã xuất`, trong khóa để không đụng lần xuất đang ghi). Các đường dọn khác đã có từ trước: giữ 5 lần xuất (xóa file, thư mục và snapshot), hoàn tác khi ghi Sheet lỗi, nút Xóa (file, thư mục, thư mục mã báo cáo rỗng, snapshot, hàng Sheet), mảnh tạm quá 24 giờ.
- Quyền riêng tư: dòng giải thích dưới khung email nay ghi rõ email dùng để xác nhận, để xem lại báo cáo và để liên hệ khi cần, và báo cáo xóa được ở "Báo cáo của tôi" (bản dịch en/fr/zh). Repo **không có trang chính sách quyền riêng tư**; nếu doanh nghiệp có chính sách riêng thì cần bổ sung ý: báo cáo (PDF, Word, câu trả lời, hồ sơ) và email được lưu để xem lại, người dùng tự xóa được, email có thể dùng để liên hệ.
- Tài liệu: `huong-dan-cai-dat-apps-script.md` mục 12 (cấu trúc Drive, `REPORTS_FOLDER_ID`), 14 (trang Báo cáo của tôi), 15 (dọn mồ côi); README đã có `USER_SESSION_SECRET`; `da-ngon-ngu.md` có phụ lục OTP và trang Báo cáo của tôi.
- Kiểm thử: bridge Apps Script giả 46 pass (thêm 4 ca: thư mục ngang cấp không nằm trong logo, chuyển thư mục cũ, `REPORTS_FOLDER_ID`, dọn snapshot mồ côi); web 64, shared 78, typecheck, eslint, `i18n:check` sạch. Chưa chạy được `pnpm build` (môi trường Claude không tải được phông Google).

**Danh sách thử thủ công trên máy Bình** (sau khi dán `Code.gs`, tạo Phiên bản mới, đặt `USER_SESSION_SECRET`): (1) xuất báo cáo, kiểm tra Drive có `Báo cáo đã xuất` ngang cấp thư mục logo, thư mục `RX-…` chứa 2 file, Sheet có link; (2) nhận OTP thật ở Gmail (cả thư rác) cho vi, en, fr, zh; (3) `Báo cáo của tôi`: tải PDF/Word, mở lại, xuất tiếp, xóa, đăng xuất; (4) thử email thứ hai không thấy báo cáo của email đầu; (5) xóa tay một dòng ở `Báo cáo đã xuất`, chạy `cleanupReportUploads`, dòng snapshot tương ứng mất; (6) `pnpm build` và thử trên Vercel (tải file lớn stream); (7) mở `/robots.txt` thấy `/bao-cao-cua-toi`.

**Việc tùy chọn (chờ quyết)**: captcha, đăng nhập một lần cho nhiều thiết bị, email nhắc xem lại báo cáo, trang quản trị xem danh sách báo cáo đã lưu, thêm SMS nếu sau này có ngân sách.

## 6. Rủi ro đã biết

- Hạn mức email của Apps Script nhỏ và dùng chung với Tư vấn, Góp ý; lưu lượng lớn cần chuyển sang dịch vụ gửi mail riêng.
- Dung lượng Drive: mỗi báo cáo gồm hai file, nhân tối đa 5 lần xuất; cần theo dõi.
- Apps Script chậm và có giới hạn thời gian mỗi lần chạy (6 phút): tệp rất lớn có thể lâu, nên ghép mảnh phải chạy trong khóa ngắn.
- Phản hồi tải file trên Vercel phải là stream để vượt giới hạn 4,5 MB; cần kiểm tra trên Vercel thật.
- Môi trường cloud của Claude không truy cập được Google: phần Drive, Sheet, MailApp chỉ thử được bằng bridge giả; Bình cần thử thật sau mỗi giai đoạn.
- Dữ liệu cá nhân (email, thông tin doanh nghiệp) lưu lâu dài: cần cập nhật chính sách quyền riêng tư và có đường xóa (nút "Xóa").

## 7. Bản đồ mã nguồn (để làm GĐ3 và GĐ4)

| Việc | Nơi |
| --- | --- |
| Schema ảnh chụp, giới hạn lưu, chia mảnh | `packages/shared/src/report-archive.ts` |
| Schema email, OTP, liên kết; `EMAIL_OTP_RULES`; `maskEmail` | `packages/shared/src/auth.ts` |
| Chia mảnh và gửi báo cáo (client) | `features/survey/lib/report-archive.ts`, `features/survey/services/report-archive.service.ts` |
| Khóa nội dung để không lưu trùng | `features/survey/lib/archive-key.ts` |
| Dựng PDF/Word, lưu, liên kết email (hook) | `features/survey/hooks/use-report-export.ts` (`archive`, `linkEmail`) |
| Khung email trong hộp thoại, form OTP dùng lại được | `features/account/components/email-otp-form.tsx`, `features/account/hooks/use-email-otp.ts` (prop `onVerified` tùy chọn nên trang "Báo cáo của tôi" dùng lại được) |
| Gọi API auth từ client | `features/account/services/account.service.ts` (`fetchSessionEmail`, `requestEmailCode`, `verifyEmailCode`, `logoutEmail`) |
| Cookie phiên, token | `server/auth/session-token.ts` (thuần, có test), `server/auth/user-session.ts` (cookie; `readSessionEmail()` là cách GĐ3 biết ai đang đăng nhập) |
| Mẫu email OTP 4 ngôn ngữ | `server/auth/otp-mail.ts` |
| Xin mã, kiểm mã, liên kết (server) | `server/auth/email-otp.ts`, `app/api/auth/*`, `app/api/reports/attach/route.ts` |
| Giới hạn tốc độ | `server/auth/limits.ts`, `server/reports/limits.ts`, `server/brand-theme/limits.ts` (hàm chung) |
| Lưu báo cáo (server) | `server/reports/archive.ts`, `app/api/reports/{upload,finish}/route.ts` |
| Apps Script | `docs/apps-script/Code.gs`: nhóm hàm `*Report*_` (lưu, dọn, giữ 5 lần xuất, link), `otpRequest_`, `otpVerify_`, `setReportOwner_` |
| Trang Báo cáo của tôi (UI) | `features/my-reports/{components/my-reports-view.tsx,services/my-reports.service.ts,lib/format-export-time.ts,constants.ts}`, `app/[locale]/(public)/bao-cao-cua-toi/{page,loading}.tsx`, link ở `components/layout/site-header.tsx`, `app/robots.ts` |
| Mở lại để chỉnh sửa (ghi localStorage) | `features/survey/lib/apply-snapshot.ts` (`applyReportSnapshot`, export ở `features/survey/index.ts`) |
| API báo cáo của chủ sở hữu | `app/api/my-reports/{route.ts,[id]/route.ts,[id]/file/route.ts,[id]/snapshot/route.ts}`, `server/my-reports/{owner.ts,limits.ts}`, schema và `groupMyReports` ở `packages/shared/src/my-reports.ts` |
| Apps Script (chủ sở hữu) | `Code.gs`: `listOwnerReports_`, `getOwnerReportFile_`, `getOwnerSnapshot_`, `deleteOwnerReport_`, `findOwnedExport_`, `trashReportExportFiles_` |
| Test | `packages/shared/tests/{report-archive,auth,my-reports}.test.ts`, `apps/web/tests/{reports,auth,my-reports}/*.test.ts`; `tests/setup/` có shim cho `server-only` và `next/headers` |

Quy tắc đã dùng ở GĐ3 và phải giữ cho việc sau: mọi route đọc dữ liệu lấy email từ `readSessionEmail()`, không nhận email từ client; kiểm chủ sở hữu ở **cả** Next và Apps Script; không lộ id file Drive ra client. Cẩn thận: `pruneReportExports_` xóa theo mã báo cáo, nên khi "Mở lại để chỉnh sửa" rồi xuất tiếp thì lần xuất mới nhất đẩy lần cũ nhất ra khỏi mức giữ 5.
