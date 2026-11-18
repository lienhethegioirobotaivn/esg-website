# Kế hoạch tính năng: lưu báo cáo đã xuất và xem lại bằng email OTP (16/11/2026)

Trạng thái: đã lập kế hoạch, chưa code. Mục 4 là các điểm mặc định đề xuất, chờ Bình chốt. Đọc cùng `boi-canh-du-an.md` (mục 4, 6, 7, 12.5) và `huong-dan-cai-dat-apps-script.md`.

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
- Khi hộp thoại tải mở ra (đã qua kiểm tra), trình duyệt tự dựng **cả PDF và Word** ở nền và gửi lên, song song với việc user bấm tải. Dùng đúng dữ liệu và ngôn ngữ hiện tại. Lỗi lưu không chặn việc tải; hộp thoại hiện trạng thái "Đã lưu / Đang lưu / Chưa lưu được, thử lại".
- Vì body route Vercel giới hạn khoảng 4,5 MB mà PDF có ảnh minh chứng có thể lớn hơn, file được **chia mảnh** (khoảng 2,5 MB nhị phân mỗi mảnh) gửi qua `POST /api/reports/upload`. Apps Script ghép lại và ghi vào Drive. Cơ chế ghép: mỗi mảnh là một tệp tạm trong thư mục tạm của Drive, bước kết thúc ghép base64 và tạo file; tệp tạm bị xóa ngay, và có trigger dọn tệp tạm quá 24 giờ.
- Drive: file vào **thư mục con theo mã báo cáo** đã có (cùng nơi lưu logo). Tên file như `buildReportFileName`.
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

## 4. Điểm mặc định chờ Bình chốt

| # | Câu hỏi | Mặc định đề xuất |
| --- | --- | --- |
| 1 | Lưu lúc nào | Tự lưu ngay khi hộp thoại tải mở, không cần bấm tải |
| 2 | Số lần xuất giữ lại cho mỗi mã báo cáo | 5 lần gần nhất, cũ hơn tự xóa |
| 3 | Báo cáo "Bản nháp" (thiếu dữ liệu) | Vẫn lưu, ghi trạng thái "Bản nháp" |
| 4 | OTP | 6 số, hiệu lực 10 phút, 5 lần thử, gửi lại sau 60 giây, phiên 30 ngày |
| 5 | Tài khoản gửi mail | Tài khoản Google đang chạy Apps Script (cần biết là Gmail thường hay Workspace) |
| 6 | Captcha | Chưa dùng, thêm nếu bị lạm dụng |
| 7 | Email đã xác thực ở thiết bị khác | Xem được **mọi** báo cáo gắn email đó; báo cáo tạo trước khi xác thực chỉ gắn cho mã báo cáo hiện tại |

## 5. Các giai đoạn

### GĐ1 - Lưu báo cáo ẩn danh (nền móng)
**Việc**: Apps Script thêm `beginUpload`, `appendChunk`, `finishReport` (ghép mảnh, ghi Drive vào thư mục báo cáo, ghi hai tab mới), cột "Email đã xác thực" tùy chọn, giữ tối đa N lần xuất và dọn tệp tạm; Next thêm `server/reports/*`, `POST /api/reports/upload` (chia mảnh, kiểm tra kích thước và loại tệp bằng chữ ký byte, kiểm tra mã báo cáo), schema zod trong `@esg/shared` (`report-archive.ts`: ảnh chụp dữ liệu, bản ghi lần xuất); client `features/survey/lib/report-archive.ts` và hook `useReportArchive` gọi khi hộp thoại mở; hộp thoại hiện trạng thái lưu; thông báo lỗi bằng `msg(...)`, chữ giao diện `t(...)`.
**Đầu ra**: mỗi lần mở hộp thoại tải, Sheet có hàng mới, Drive có PDF và Word, ảnh chụp dữ liệu được ghi đầy đủ.
**Test**: test đơn vị cho schema, chia và ghép mảnh, bỏ ảnh minh chứng khỏi ảnh chụp; chạy với bridge giả mô phỏng `Code.gs` (tệp lớn hơn 4,5 MB, mảnh bị mất, gửi lặp, lỗi giữa chừng, vượt 5 lần xuất); Bình dán `Code.gs`, tạo Phiên bản mới, xuất thật và kiểm tra Drive và Sheet.

**Nhật ký GĐ1 (đã làm xong, đã kiểm thử bằng bridge giả)**:
- Hai route thay vì một: `POST /api/reports/upload` (multipart, từng mảnh) và `POST /api/reports/finish` (JSON, ghép và ghi Sheet/Drive). Mảnh 2.499.999 byte (chia hết cho 3 nên base64 từng mảnh nối được), tối đa 12 mảnh, mỗi file tối đa 25 MB, snapshot tối đa 600.000 ký tự.
- Apps Script: hành động `uploadReportChunk`, `finishReport`; tab `Báo cáo đã xuất`, `Nội dung khảo sát`; thư mục Drive `Tải lên tạm`; giữ 5 lần xuất mới nhất cho mỗi mã báo cáo, bản cũ bị xóa cả file Drive lẫn hàng snapshot; lỗi ghi Sheet thì hoàn tác (xóa snapshot, bỏ file vừa tạo); trigger hằng ngày `installReportCleanupTrigger` dọn mảnh tạm quá 24 giờ.
- Web: `useReportExport` lưu tự động khi mở dialog (chống lưu trùng theo khóa nội dung), hiện trạng thái đang lưu, đã lưu, lỗi kèm nút Thử lại; lỗi lưu không chặn tải file.
- `callAbout` thêm tham số timeout; test web dùng shim `tests/setup/server-only.cjs`.
- Kiểm thử: shared 70 pass, web 26 pass, bridge Apps Script giả 16/16, typecheck và `i18n:check` sạch. Chưa thử được Google/Vercel thật và `pnpm build`.

### GĐ2 - Xác thực email OTP
**Việc**: Apps Script `otpRequest`, `otpVerify`, `attachOwner` (gắn email vào các lần xuất của mã báo cáo, và vào cột "Email đã xác thực" ở Data khách hàng); Next `server/auth/*` (cookie phiên ký HMAC theo mẫu `server/admin/session.ts`, giới hạn theo IP, dựng email theo ngôn ngữ), 3 route auth, biến `USER_SESSION_SECRET`; mục OTP trong hộp thoại tải; trạng thái liên kết lưu cho phiên.
**Đầu ra**: nhập email, nhận mã, xác nhận, hàng của báo cáo hiện tại có email chủ sở hữu.
**Test**: test đơn vị cho ký và kiểm tra cookie, quy tắc hạn mức, hết hạn, sai quá 5 lần, gửi lại; bridge giả; email thật trên máy Bình (kiểm tra hộp thư rác, 4 ngôn ngữ, hạn mức `getRemainingDailyQuota`).

### GĐ3 - Trang "Báo cáo của tôi"
**Việc**: tuyến `/bao-cao-cua-toi` kèm `loading.tsx`, form đăng nhập OTP dùng lại thành phần của GĐ2, danh sách, `GET /api/my-reports`, `GET /api/my-reports/[id]/file` (stream, kiểm tra chủ sở hữu), "Mở lại để chỉnh sửa" (ghi localStorage rồi chuyển về `/`), "Xóa" và "Đăng xuất"; link ở header và menu di động; `noindex`, `robots.ts`; chữ giao diện qua `t(...)`.
**Đầu ra**: đăng nhập bằng OTP, xem, tải, mở lại, xóa báo cáo cũ.
**Test**: truy cập chéo (báo cáo của email khác phải bị từ chối), cookie hết hạn hoặc bị sửa, tải file lớn, mở lại rồi xuất tiếp (tạo lần xuất mới), `/en`, `/fr`, `/zh`, màn hình hẹp.

### GĐ4 - Hoàn thiện và bàn giao
**Việc**: dọn dữ liệu mồ côi hoàn chỉnh (xóa báo cáo xóa luôn file Drive, hàng Sheet, mảnh nội dung; trigger dọn tệp tạm bỏ dở), `i18n:sync` rồi commit `src/i18n/messages/`, cập nhật `huong-dan-cai-dat-apps-script.md` (mục mới: dán lại `Code.gs`, Phiên bản mới, quyền Drive/Mail, cài trigger dọn), README (biến `USER_SESSION_SECRET`), `da-ngon-ngu.md`, dòng quyền riêng tư; chạy `pnpm typecheck`, `pnpm lint`, test `@esg/shared` và web, `i18n:check`; danh sách kiểm thử thủ công.
**Việc tùy chọn (chờ quyết)**: captcha, đăng nhập một lần cho nhiều thiết bị, email nhắc xem lại báo cáo, trang quản trị xem danh sách báo cáo đã lưu, thêm SMS nếu sau này có ngân sách.

## 6. Rủi ro đã biết

- Hạn mức email của Apps Script nhỏ và dùng chung với Tư vấn, Góp ý; lưu lượng lớn cần chuyển sang dịch vụ gửi mail riêng.
- Dung lượng Drive: mỗi báo cáo gồm hai file, nhân tối đa 5 lần xuất; cần theo dõi.
- Apps Script chậm và có giới hạn thời gian mỗi lần chạy (6 phút): tệp rất lớn có thể lâu, nên ghép mảnh phải chạy trong khóa ngắn.
- Phản hồi tải file trên Vercel phải là stream để vượt giới hạn 4,5 MB; cần kiểm tra trên Vercel thật.
- Môi trường cloud của Claude không truy cập được Google: phần Drive, Sheet, MailApp chỉ thử được bằng bridge giả; Bình cần thử thật sau mỗi giai đoạn.
- Dữ liệu cá nhân (email, thông tin doanh nghiệp) lưu lâu dài: cần cập nhật chính sách quyền riêng tư và có đường xóa (nút "Xóa").
