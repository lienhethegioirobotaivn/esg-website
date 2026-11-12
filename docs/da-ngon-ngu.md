# Đa ngôn ngữ (vi, en, fr, zh)

Tài liệu bàn giao cho người phát triển và người quản trị. Nhật ký từng giai đoạn nằm ở [ke-hoach-da-ngon-ngu.md](ke-hoach-da-ngon-ngu.md); cài Apps Script ở [huong-dan-cai-dat-apps-script.md](huong-dan-cai-dat-apps-script.md).

## 1. Nguyên tắc

- Tiếng Việt là ngôn ngữ gốc. Người quản trị chỉ nhập tiếng Việt, các ngôn ngữ khác được dịch tự động và miễn phí (chữ cố định bằng Apps Script `LanguageApp` lúc `pnpm dev`/`pnpm build`, nội dung động bằng Apps Script lúc chạy).
- Tiếng Việt không có tiền tố địa chỉ; `/en`, `/fr`, `/zh` cho ba ngôn ngữ còn lại. `/vi/...` chuyển 308 về địa chỉ không tiền tố.
- Ngôn ngữ lần đầu truy cập theo quốc gia: VN là vi; CN, HK, MO, TW là zh; FR, BE, LU, MC là fr; còn lại là en. Quốc gia lấy từ header `x-vercel-ip-country` hoặc `cf-ipcountry`, sau đó `Accept-Language`, sau đó en. Bot tìm kiếm không bị chuyển hướng. Lựa chọn được nhớ trong cookie `esg-locale` (1 năm). Thử nhanh bằng `?lang=en|fr|zh|vi`.
- Khu `/quan-tri` luôn là tiếng Việt. Email thông báo nội bộ và dữ liệu gửi vào Sheet luôn là tiếng Việt (giá trị chuẩn).

## 2. Chữ cố định trong giao diện

- Khóa là chính câu tiếng Việt: `t("Câu gốc {ten}", { ten })`. Hằng số dùng `msg("...")` (trả lại nguyên chuỗi, chỉ để công cụ đồng bộ nhìn thấy) rồi dịch lúc hiển thị bằng `t(HANG_SO)`.
- Client dùng `useT()` từ `@/features/locale`; server dùng `await getT()` và `getLocale()` từ `@/features/locale/server`.
- Chỉ nhận dạng lời gọi viết trực tiếp `t("...")` hoặc `msg("...")` (chuỗi nguyên văn, không nối chuỗi). Chuỗi có biến phải dùng `{ten}` và truyền tham số, không dùng template literal.
- `translateOptions(options, t)` dịch danh sách `{ value, label }`; `value` luôn là giá trị tiếng Việt chuẩn.
- Chữ chưa có bản dịch hiện tiếng Việt, không gây lỗi.
- File được `tools/esg-agents` import trực tiếp từ `apps/web` (ví dụ `features/company/constants.ts`) không được dùng alias `@/`.
- Các lệnh: `pnpm --filter web i18n:sync` (quét chuỗi, dịch phần thiếu, ghi `src/i18n/messages/{en,fr,zh}.json`; tự chạy trước `dev` và `build`), `pnpm --filter web i18n:check` (báo thiếu, thoát mã 1), biến `I18N_SKIP=1` bỏ qua đồng bộ. Cần `GOOGLE_APPS_SCRIPT_URL` và `GOOGLE_APPS_SCRIPT_SECRET` để dịch. Sau khi sync nhớ commit các file trong `src/i18n/messages/`.
- `src/i18n/glossary.json`: `keep` (giữ nguyên, ví dụ ESG, Scope 1), `exact` (bản dịch cố định cho cả câu), `terms` (thuật ngữ theo từng ngôn ngữ). `src/i18n/overrides/<ngôn ngữ>.json` ghi đè bản dịch của một câu và có ưu tiên cao hơn dịch máy.

## 3. Nội dung động (bộ câu hỏi, bài viết, số liệu)

- Máy chủ gom chữ tiếng Việt, tra bộ nhớ bản dịch (tab "Bản dịch" của Sheet dữ liệu khách hàng), phần thiếu được dịch bằng Apps Script rồi ghi lại. Khóa là mã băm sha256 (16 ký tự đầu) của câu gốc đã chuẩn hóa NFC.
- Khi gặp câu chưa dịch, trang chờ tối đa 8 giây (4 luồng song song, mỗi đợt 10 câu), phần còn lại dịch nền. Bộ nhớ trong RAM của mỗi máy chủ sống 1 phút.
- Tab "Bản dịch" có cột `en`, `fr`, `zh` (tự động) và `en (sửa tay)`, `fr (sửa tay)`, `zh (sửa tay)`. Bản sửa tay luôn thắng; ô sửa tay trống thì dùng bản tự động; dịch tự động không bao giờ ghi đè cột sửa tay. Sửa tay xong tối đa khoảng 1 phút web đổi.
- Đổi chữ gốc tiếng Việt thì câu mới có mã băm mới và được dịch lại; bản sửa tay của câu cũ không tự theo sang.
- Dịch tự động không cần bấm nút:
  - Lưu hoặc xóa bài, lưu số liệu trên trang quản trị tự dịch nền và dọn dòng không còn dùng.
  - Sửa Sheet câu hỏi: trigger Apps Script (`installTranslationTriggers`) đặt cờ, trong tối đa 10 phút gọi `GET /api/cron/translations?prune=1` (khóa `Authorization: Bearer <CRON_SECRET>`), mỗi 24 giờ chạy một lượt đầy đủ.
  - Muốn dịch ngay: `/quan-tri/ban-dich` → "Dịch sẵn nội dung".
- Dọn dữ liệu mồ côi: hành động `pruneTranslations` xóa dòng không còn thuộc bộ câu hỏi, bài (kể cả nháp) hoặc nhãn số liệu; dòng có chữ ở cột sửa tay luôn được giữ (xóa tay nếu muốn); lấy dữ liệu lỗi hoặc rỗng thì dừng và không xóa gì. Quy ước chung của dự án: tính năng nào lưu dữ liệu lên Google Sheet hoặc Drive phải có cơ chế dọn dữ liệu mồ côi.

## 4. SEO

- `INDEXABLE_LOCALES` (`features/locale/constants.ts`) quyết định ngôn ngữ nào được index; ngôn ngữ ngoài danh sách có `noindex`.
- Mỗi trang có canonical riêng theo ngôn ngữ, `hreflang` cho vi, en, zh-CN, fr và `x-default` (về tiếng Việt), `og:locale` và `og:locale:alternate`. JSON-LD có `inLanguage` và URL theo ngôn ngữ. Sitemap có đủ 4 URL cho mỗi trang kèm hreflang.
- Tiêu đề, mô tả trang, tagline và breadcrumb đều đi qua `t(...)`. Hàm dùng chung: `lib/seo.ts` (`pageMetadata`, `localeAlternates`, `localeLanguages`, `openGraphLocales`, `breadcrumbJsonLd`).
- Trước khi gửi sitemap cho Google, chạy dịch sẵn để tránh nội dung tiếng Việt xuất hiện trên URL ngôn ngữ khác (bị coi là trùng).

## 5. Báo cáo PDF và Word

- `buildReportModel` và `listImprovementSuggestions` (`packages/shared`) nhận hàm dịch tùy chọn `translate`; không truyền thì kết quả giống hệt tiếng Việt. Trạng thái nội bộ (mức ưu tiên, trạng thái việc cần làm) giữ giá trị tiếng Việt và chỉ dịch khi hiển thị.
- PDF: `report-text-context.tsx` đưa `t` và ngôn ngữ vào cây tài liệu; Word: `generate-docx.ts` nhận `t`. Văn bản của bộ câu hỏi đã được dịch riêng từ máy chủ nên không dịch lại.
- Tiếng Trung PDF dùng Noto Sans SC (`public/fonts`, giấy phép OFL, cắt còn khoảng 7.500 chữ thông dụng, chỉ tải khi xuất bản tiếng Trung). Ngắt dòng theo từng chữ Hán (`report/cjk-break.ts`); vì react-pdf chèn `-` khi ngắt giữa từ, ký tự `-` ASCII trong phông này hiển thị trống và dấu `-` thật trong báo cáo được đổi thành `‐` (U+2010). Nếu thay bằng phông đầy đủ phải sửa lại cách này.
- Word tiếng Trung đặt phông Đông Á Microsoft YaHei và ngôn ngữ zh-CN; cần máy có phông này để xem đúng.
- Số vẫn theo định dạng `vi-VN`; dấu phân cách `, ` và `; ` giữ dạng ASCII.

## 6. Thêm hoặc sửa chữ

| Việc | Cách làm |
| --- | --- |
| Thêm chữ cố định mới trong code | Bọc `t("...")` hoặc `msg("...")`, chạy `pnpm dev` (tự đồng bộ), commit `src/i18n/messages/` |
| Sửa bản dịch một câu cố định | Thêm vào `src/i18n/overrides/<ngôn ngữ>.json` theo cặp câu gốc và bản dịch |
| Đổi cách dịch một thuật ngữ cho cả website | Sửa `src/i18n/glossary.json` rồi chạy `pnpm --filter web i18n:sync` |
| Sửa bản dịch bài viết, câu hỏi | Điền cột `(sửa tay)` trong tab "Bản dịch" |
| Đổi chữ gốc tiếng Việt của câu cố định | Sửa trong code, chạy sync; câu cũ trở thành mồ côi trong file messages và được dọn ở lần sync sau |

## 7. Danh sách kiểm thử thủ công

1. Mở `/`, `/en`, `/fr`, `/zh`: ngôn ngữ đúng, công cụ đổi ngôn ngữ hoạt động, liên kết nội bộ giữ đúng tiền tố, đang có bản nháp chưa lưu thì đổi ngôn ngữ hiện hộp cảnh báo.
2. Xóa cookie rồi mở với `?lang=` khác nhau và thử `Accept-Language`; trên Vercel thử từ quốc gia khác nhau.
3. Điền khảo sát ở từng ngôn ngữ, lưu doanh nghiệp, gửi liên hệ và ý kiến; thông báo lỗi hiện đúng ngôn ngữ; dữ liệu trong Sheet luôn là tiếng Việt chuẩn.
4. Xuất PDF và Word ở từng ngôn ngữ; với tiếng Trung kiểm tra không có ô trống và chữ không đè; xem trước và xuất đều đúng ngôn ngữ.
5. Xem nguồn trang: canonical, hreflang, `og:locale`, không `noindex` ở ngôn ngữ đã mở; `/sitemap.xml` có đủ 4 ngôn ngữ.
6. Lưu một bài mới, vài chục giây sau mở bản `/fr`; sửa một câu hỏi trong Sheet và kiểm tra sau tối đa 10 phút.
7. Xóa một bài: dòng bản dịch của bài biến mất, dòng có sửa tay còn lại.
8. `pnpm typecheck`, `pnpm lint`, `pnpm --filter @esg/shared test`, `pnpm --filter web i18n:check`.

## 8. Giới hạn đã biết

- `pnpm build` và `LanguageApp` thật chưa được kiểm tra trong môi trường phát triển của Claude (không truy cập Google); hãy chạy thử trên máy bạn.
- Dịch máy có thể sai thuật ngữ; dùng glossary, overrides và cột sửa tay để sửa.
- Chữ hiếm ngoài bộ 7.500 chữ của phông Noto Sans SC trong PDF sẽ hiện ô trống.
- Trang quản trị, email thông báo nội bộ, công cụ AI nhập liệu (`cong-cu-ai`) và `features/survey/lib/report-data.ts` (không còn được dùng) vẫn là tiếng Việt.
- Gói Vercel miễn phí giới hạn thời gian hàm; nút "Dịch sẵn nội dung" có thể phải bấm lại.
