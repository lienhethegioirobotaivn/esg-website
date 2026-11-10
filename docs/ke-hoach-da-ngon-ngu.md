# Kế hoạch tính năng đa ngôn ngữ (VI, EN, FR, ZH) - cập nhật 09/11/2026

Trạng thái: đã chốt phần lớn quyết định (mục 3), còn hai điểm chờ Bình xác nhận (đánh dấu "chờ xác nhận"). Chưa code. Đọc cùng `boi-canh-du-an.md` (mục 12.7).

## 1. Yêu cầu đã chốt
- 4 ngôn ngữ: Việt (vi), Anh (en), Pháp (fr), Trung (zh).
- Lần đầu vào web: ngôn ngữ mặc định theo vị trí (quốc gia). Ngoài 4 ngôn ngữ thì dùng tiếng Anh.
- Dịch tự động và miễn phí, lấy tiếng Việt làm gốc. Người quản trị không phải nhập từng ngôn ngữ.
- Làm theo giai đoạn do Bình ra lệnh. Mỗi giai đoạn trả về: file nén các file đổi, cách chạy (nếu có), danh sách cần test, commit message.

## 2. Hiện trạng trong repo (đã đọc)
- `features/locale/` đã có `LOCALES`, nhãn, cờ, `LanguageSwitcher`, nhưng store zustand chỉ đổi `document.documentElement.lang`, không dịch gì.
- Chữ giao diện viết thẳng tiếng Việt trong khoảng 70 file (khoảng 1.400 chuỗi trong dấu nháy và 80 chuỗi trong JSX), chưa có từ điển.
- `app/layout.tsx`: `<html lang="vi">` cứng; Noto Sans SC chỉ nạp bộ `latin`; metadata, `SITE_LOCALE`, `SITE_TAGLINE` tiếng Việt.
- Các trang public và quản trị đã `force-dynamic`. Chưa có `proxy.ts` (Next 16 đổi tên middleware thành proxy).
- Bộ câu hỏi đọc từ Sheet qua `server/survey-bank`; bài viết qua `server/about/bridge.ts` + Apps Script (`docs/apps-script/Code.gs`).
- Báo cáo PDF dùng DejaVu Sans (không có chữ Hán); chữ cố định ở `report/copy.ts`, câu diễn giải sinh theo quy tắc trong `@esg/shared`.

## 3. Quyết định
1. **Tiền tố đường dẫn (đã chốt).** Đề xuất cụ thể (chờ xác nhận): tiếng Việt **không có tiền tố** để giữ nguyên các địa chỉ đã được lập chỉ mục (`/ve-esg-report-online/...`); các ngôn ngữ khác dùng `/en`, `/fr`, `/zh`. Phần đường dẫn sau tiền tố giữ nguyên chữ Việt không dấu hiện có (không dịch slug). Chuyển `app/(public)` vào `app/[locale]/(public)`; `proxy.ts` viết lại nội bộ đường dẫn tiếng Việt sang `/vi/...`. `/api`, `/quan-tri`, tệp tĩnh không có tiền tố.
2. **Bảng quốc gia (đã chốt):** vi: VN. zh: CN, HK, MO, TW. fr: FR, BE, LU, MC. Còn lại en. Không xác định được vị trí (chạy local) thì dùng `Accept-Language`, rồi en.
3. **Công cụ dịch (đã chốt ưu tiên miễn phí, tự động):** `LanguageApp.translate` của Apps Script. Miễn phí, không cần khóa, dùng hạ tầng hiện có. Có hạn mức theo ngày của Google (kiểm tra số liệu khi làm). Chất lượng ở mức dịch máy.
4. **Chữ giao diện cố định (chờ xác nhận):** khóa là câu tiếng Việt gốc `t("...")`; bản dịch en/fr/zh là file JSON do công cụ **tự sinh**, không sửa tay từng ngôn ngữ. Lệnh `i18n:translate` chỉ dịch chuỗi mới hoặc đã đổi chữ gốc, và được gắn vào `predev`/`prebuild` nên tự chạy khi `pnpm dev` hoặc `pnpm build` (lỗi mạng thì bỏ qua, chuỗi chưa dịch hiện tiếng Việt). Bản dịch đầu tiên do Claude dịch trực tiếp có từ điển thuật ngữ ESG. Muốn sửa riêng một bản dịch thì có tệp ghi đè tùy chọn.
5. **SEO theo vị trí:** nhờ tiền tố, mỗi ngôn ngữ có địa chỉ riêng, có `hreflang` và `canonical` theo từng ngôn ngữ, `x-default` trỏ về tiếng Việt, sitemap liệt kê đủ bản. Vị trí chỉ dùng để chọn ngôn ngữ cho **người** vào lần đầu (chuyển hướng 307 khi chưa có cookie). Bot không bị chuyển hướng: bot yêu cầu địa chỉ nào thì nhận đúng bản ngôn ngữ đó.
6. **`/quan-tri` giữ tiếng Việt (đã chốt).**
7. **Dữ liệu gửi về Sheet luôn lưu giá trị gốc tiếng Việt (đã chốt)**; chữ người dùng tự gõ giữ nguyên; email thông báo nội bộ giữ tiếng Việt.
8. **Báo cáo PDF/Word:** để giai đoạn cuối, xuất theo ngôn ngữ đang chọn. Tiếng Trung cần phông có chữ Hán (nặng, cần cắt bộ chữ).
9. **Nội dung động** (câu hỏi từ Sheet, bài viết, số liệu): dịch ở máy chủ khi có người xem, lưu vào tab "Bản dịch" trong Google Sheet (khóa theo mã băm câu gốc + ngôn ngữ); sửa chữ gốc thì tự dịch lại; có thể sửa tay tùy chọn.

## 4. Các giai đoạn
**GĐ1 - Định tuyến theo ngôn ngữ**: bảng quốc gia, cookie `esg-locale`, `proxy.ts` (chuyển hướng lần đầu cho người, viết lại `/vi`), chuyển tuyến vào `app/[locale]`, `generateStaticParams`/`getLocale`, `<html lang>`, `Link` có tiền tố (`GuardedLink`, `router.push`, `ABOUT_PATH`), nút chọn ngôn ngữ chạy thật (đổi tiền tố, ghi cookie), phông chữ Hán.
**GĐ2 - Nền dịch chữ cố định**: `I18nProvider`, `useT()`, `getT()` với `t("Câu gốc", { biến })`; lệnh `i18n:extract` và `i18n:translate`; từ điển thuật ngữ; bọc thử header và footer.
**GĐ3 - Bọc chữ giao diện công khai** (2-3 đợt): layout, trang chủ, khảo sát, form doanh nghiệp, Tư vấn, góp ý, carbon, trang Về, hộp thoại, thông báo lỗi (kể cả từ `@esg/shared`, dịch ở nơi hiển thị).
**GĐ4 - Nội dung động**: dịch vụ dịch + tab "Bản dịch" (sửa `Code.gs`, Bình dán lại và tạo Phiên bản mới); áp cho bộ câu hỏi, gợi ý, lựa chọn; bài viết (dịch từng đoạn chữ trong JSON ProseMirror, giữ cấu trúc, ảnh, bảng) và số liệu thành tựu.
**GĐ5 - SEO** (đã làm, xem bên dưới): metadata, JSON-LD, `og:locale`, `hreflang`, canonical, sitemap theo ngôn ngữ, mở index; kèm dọn bản dịch mồ côi.
**GĐ6 - Báo cáo**: `copy.ts`, nhãn, câu diễn giải theo ngôn ngữ; phông chữ Hán; Word.
**GĐ7 - Rà soát**: typecheck, lint, test, cập nhật README và tài liệu bàn giao.

## 4.1 Tiến độ
**GĐ1 (09/11/2026): đã làm, chờ Bình test trên máy thật.** Quyết định đã chốt: tiếng Việt không tiền tố, `/en` `/fr` `/zh` cho ba ngôn ngữ còn lại; `/vi/...` chuyển 308 về địa chỉ không tiền tố.
- Mã: `src/proxy.ts` (chọn ngôn ngữ lần đầu theo header `x-vercel-ip-country` hoặc `cf-ipcountry`, rồi `Accept-Language`, rồi en; bot không bị chuyển hướng; cookie `esg-locale` 1 năm; `?lang=xx` để ép/thử); `features/locale/{constants,lib/path,lib/detect,lib/persist-locale,hooks/use-locale,components/locale-link,components/language-switcher}`; `app/[locale]/layout.tsx` là root layout (html lang theo ngôn ngữ, `noindex` cho ngôn ngữ chưa dịch qua `INDEXABLE_LOCALES = ["vi"]` ở `locale/constants.ts`, **GĐ5 phải mở cho en/fr/zh khi đã dịch xong**); `app/quan-tri/layout.tsx` thành root layout riêng; `GuardedLink`, `LocaleLink`, `useLocalePath` tự thêm tiền tố.
- Cookie theo "ngôn ngữ trang đang xem gần nhất": proxy đặt khi phát hiện lần đầu; `LanguageSwitcher` đặt khi bấm đổi và đồng bộ khi mở trang có tiền tố.
- Đổi ngôn ngữ qua `LanguageSwitcher` đi qua hộp cảnh báo rời trang (leave-guard) nếu đang có bản nháp chưa lưu; hộp này đã dịch ở GĐ3 đợt 1.
- Chưa làm trong GĐ1 (cố ý): dịch chữ giao diện (GĐ2-3), `hreflang`/sitemap theo ngôn ngữ (GĐ5), phông chữ Hán (biến `--font-noto-sans-sc` hiện không được dùng ở đâu; chữ Hán dùng phông hệ thống nhờ `lang="zh-CN"`), `global-not-found` (URL không khớp tuyến nào hiện hiện trang 404 mặc định của Next).
- Đã kiểm tra: typecheck, lint, 27 tình huống chuyển hướng bằng curl, 18 kiểm tra trình duyệt bằng Playwright. Chưa kiểm tra được: `pnpm build` (sandbox không tải được phông Google), luồng leave-guard thật (sandbox không đọc được Google Sheet nên không dựng được màn khảo sát), header quốc gia thật của Vercel.

**GĐ2 (09/11/2026): đã làm, chờ Bình test trên máy thật.**
- Cú pháp: `t("Câu tiếng Việt", { biến })` trong component (client: `useT()` từ `@/features/locale`; server: `await getT()` từ `@/features/locale/server`), và `msg("...")` đánh dấu chuỗi nằm trong hằng số ngoài component (rồi `t(biến)` lúc hiển thị). Khóa là câu tiếng Việt, chuỗi thiếu bản dịch thì hiện tiếng Việt.
- `I18nProvider` bọc trong `app/[locale]/layout.tsx`, nạp từ điển theo ngôn ngữ (`i18n/messages/{en,fr,zh}.json` + `i18n/overrides/*.json`, overrides thắng). `getLocale()` dùng `next/root-params`.
- Công cụ: `apps/web/scripts/i18n/{extract,glossary,provider,sync}.ts`, lệnh `pnpm --filter web i18n:sync` / `i18n:check`, tự chạy qua `predev`/`prebuild` (lỗi mạng hay thiếu cấu hình chỉ cảnh báo). Trích bằng TypeScript API (`t(...)`, `msg(...)`, gộp được `"a" + "b"`), bỏ bản dịch chuỗi không còn dùng, chỉ dịch chuỗi mới; bảo vệ biến `{x}`, từ khóa giữ nguyên và thuật ngữ trong `i18n/glossary.json` (keep / exact / terms); dịch xong mà mất biến hay thuật ngữ thì loại và báo; giữ kiểu xuống dòng (CRLF) của file JSON.
- Apps Script: thêm hành động `translate` (dùng `LanguageApp`, tối đa 50 chuỗi mỗi lần) và gọi thử trong `authorize()`; cần dán lại `Code.gs`, chạy `authorize`, triển khai Phiên bản mới. Hướng dẫn ở mục 11 của `huong-dan-cai-dat-apps-script.md`.
- Đã bọc làm thử: header (cả menu di động), footer, hộp Hướng dẫn, `Modal`, nhóm nút ngôn ngữ, `menuLabel` của `INQUIRY_COPY`. 29 chuỗi, bản en/fr/zh đầu tiên do Claude dịch tay (có thuật ngữ ESG, tên nút khớp giữa các chuỗi).
- Chưa làm (cố ý): phần còn lại của giao diện (GĐ3), nội dung động (GĐ4).
- Đã kiểm tra: typecheck, lint, thử script với bridge giả (chuỗi có biến, thuật ngữ, ký tự `&`, chuỗi dịch hỏng, override, mồ côi, CRLF, `--check`, lỗi bridge giữa chừng, tắt bridge), 19 kiểm tra trình duyệt. Chưa kiểm tra được: `LanguageApp` thật (sandbox không truy cập Google), `pnpm build`.

**GĐ3 đợt 1 (09/11/2026): đã làm, chờ Bình test trên máy thật.** Chia GĐ3 làm 3 đợt: đợt 1 = giao diện ngoài khảo sát; đợt 2 = màn khảo sát (form doanh nghiệp, câu hỏi, câu trả lời, minh chứng, kế hoạch cải thiện, hộp tải báo cáo); đợt 3 = thông báo lỗi trong `@esg/shared`, tùy chọn trong `data/*` (quy mô, ngành) và thông báo từ server, dịch ở nơi hiển thị.
- Đã bọc: trang chủ (tiêu đề, mô tả, thông báo lỗi tải bộ câu hỏi), hộp Tư vấn / Kiểm định (`ContactDialog` và toàn bộ `INQUIRY_COPY`), thẻ góp ý, hộp rời trang (leave-guard), hộp "Tính năng đang cập nhật" (trang carbon), toàn bộ trang Về (Thành tựu, Tin tức, bài viết, chia sẻ, thích, phân trang, ô tìm kiếm, chip lọc, khung chờ, tên mục, tên chuyên mục).
- `ArticleView` thêm `"use client"` vì được dùng cả ở trang công khai (server) lẫn bản xem trước trong trang quản trị; ở quản trị không có provider nên `useT` trả nguyên tiếng Việt. `StatsBand` dùng `getT`.
- Còn tiếng Việt cố ý ở đợt này: tiêu đề/mô tả SEO (`metadata`, JSON-LD, breadcrumb) là GĐ5; tiêu đề, tóm tắt, nội dung bài viết và nhãn số liệu lấy từ Sheet là GĐ4 (nhãn số liệu và tên chuyên mục đã bọc `t(...)` nên khi có bản dịch tự hiện); lỗi zod từ `@esg/shared` và tên tùy chọn Quy mô/Ngành ở hộp Tư vấn là đợt 3.
- Thêm 98 chuỗi, bản en/fr/zh do Claude dịch tay (tên nút khớp glossary); lần chạy `i18n:sync` có Apps Script thật sẽ chỉ dịch chuỗi nào còn thiếu.
- Đã kiểm tra: typecheck, lint (không lỗi mới), `i18n:check` (0 thiếu), Playwright thấy đúng chữ en/fr/zh ở trang chủ (nhánh lỗi tải khảo sát vì sandbox không đọc được Sheet), trang Về, Tin tức, hộp carbon, ô tìm kiếm, header; không có lỗi trang. Chưa kiểm tra được: hộp Tư vấn, thẻ góp ý, hộp rời trang bằng mắt trên trình duyệt (cần màn khảo sát hoặc bridge giả), `pnpm build`.

**GĐ3 đợt 2 (10/11/2026): đã làm, chờ Bình test trên máy thật.**
- Đã bọc toàn bộ màn khảo sát: form thông tin doanh nghiệp (kể cả "Bối cảnh doanh nghiệp", logo, các mục thu gọn), thẻ câu hỏi, nhóm câu hỏi, điều hướng nhóm, thanh nháp và thông báo khôi phục nháp, tiến độ, kế hoạch cải thiện, tải minh chứng, bảng hướng dẫn, các hộp xuất báo cáo (chưa thể xuất, tải báo cáo, bản nháp, xem trước, làm báo cáo mới), thông báo lỗi trong hook xuất/xem trước báo cáo.
- `@esg/shared`: thêm `src/i18n.ts` (hàm `msg` danh tính riêng cho package này, không export ra `index.ts`) và bọc `msg(...)` cho nhãn lựa chọn trả lời, nhu cầu tư vấn/thẩm định, loại hình pháp lý, khoảng doanh thu, hoạt động đặc thù, có/không/chưa rõ, kỳ báo cáo, trạng thái kế hoạch và thông báo lỗi zod của form doanh nghiệp, Tư vấn, góp ý. Giá trị lưu vào Sheet không đổi (vẫn tiếng Việt chuẩn), chỉ chữ hiển thị đi qua `t()`.
- Thêm `translateOptions(options, t)` ở `@/features/locale` để dịch nhãn của danh sách `{ value, label }`; dùng cho ô Quy mô, Ngành, Kỳ báo cáo, Nhu cầu... (cả hộp Tư vấn của đợt 1). `data/company-options.ts` bọc `msg`.
- `formatSavedAt` nhận thêm ngôn ngữ nên giờ lưu bản nháp hiển thị theo định dạng của ngôn ngữ đang xem. `getReportDraftState` nhận thêm tham số `t` (mặc định tiếng Việt, dùng khi tạo file báo cáo).
- Cố ý còn tiếng Việt: nội dung bộ câu hỏi lấy từ Sheet (tên nhóm, câu hỏi, hướng dẫn, gợi ý cải thiện, đề xuất của hệ thống) là GĐ4; chữ trong file PDF/Word, dòng chú thích bản nháp trong PDF và nhãn "Chưa trả lời", "Số liệu:" trong báo cáo là GĐ6; thông báo lỗi "tối đa N ký tự" của các ô tùy chọn ở mục Bối cảnh doanh nghiệp (câu ghép tên trường) còn tiếng Việt; thông báo lỗi từ server (API) chỉ dịch được khi trùng một câu đã có bản dịch.
- Tên 3 trụ cột Môi trường/Xã hội/Quản trị đã dịch ở màn khảo sát nhờ từ điển glossary.
- Thêm 283 chuỗi, bản en/fr/zh do Claude dịch tay (số tiền: 1 tỷ = 10^9 nên "3 tỷ" = "30 亿" trong tiếng Trung).
- Đã kiểm tra: typecheck cả `apps/web` và `packages/shared`, lint (không lỗi), `i18n:check` 0 thiếu, Playwright trên trang thử tạm (đã xóa) với bộ câu hỏi giả: form, ô chọn, câu trả lời, tiến độ, kế hoạch, hộp "Chưa thể xuất báo cáo" đúng ngôn ngữ ở en/fr/zh, không lỗi trang. Chưa kiểm tra được: dữ liệu thật từ Sheet, tải PDF/Word (vẫn tiếng Việt), `pnpm build`.
- Còn lại của GĐ3: không còn đợt 3 riêng, phần `@esg/shared` và `data/*` đã gộp vào đợt này. GĐ3 xem như xong, chờ Bình test rồi sang GĐ4.

### GĐ4 - Nội dung động (10/11/2026): đã làm, chờ Bình test với Sheet thật
- Cơ chế: máy chủ Next lấy chữ gốc từ Sheet như cũ, rồi tra "bộ nhớ dịch" (tab **Bản dịch** trong Google Sheet khách hàng, khóa = mã băm 16 ký tự của câu gốc). Có bản dịch thì thay vào; chưa có thì trang vẫn trả tiếng Việt cho phần đó và dịch chạy nền bằng `after()` (hành động `translate` đã có), lưu lại bằng hành động mới `saveTranslations`; người xem sau thấy bản dịch. Bộ nhớ trong RAM 1 phút (xem mục sửa lỗi bên dưới).
- Apps Script (`Code.gs`) thêm `listTranslations` và `saveTranslations`, tab "Bản dịch" tự tạo với cột tự động `en/fr/zh` và cột sửa tay `en/fr/zh (sửa tay)` luôn thắng. Bình phải dán lại `Code.gs` và tạo Phiên bản mới.
- Phạm vi dịch: bộ câu hỏi (tên trụ cột, nhóm, mô tả nhóm, câu hỏi, chủ đề, gợi ý cải thiện, hướng dẫn, minh chứng gợi ý; không dịch đơn vị), bài viết (tiêu đề, tóm tắt, từng đoạn chữ trong nội dung giữ nguyên định dạng đậm/nghiêng/liên kết, ảnh, bảng; chú thích và mô tả ảnh), nhãn số liệu thành tựu. Danh sách bài chỉ dịch tiêu đề và tóm tắt, bài chi tiết mới dịch cả nội dung. Slug, tác giả, ngày giữ nguyên.
- Từ điển glossary dùng chung với công cụ `i18n:sync` (file `features/locale/lib/glossary.ts`, script gọi lại từ đó), áp dụng cả `exact` (3 tên trụ cột) và `terms`.
- Hàm `getPosts`, `getPost`, `getAchievementStats` nhận thêm ngôn ngữ (mặc định `vi`, sitemap và trang quản trị không đổi). Trang chủ gọi `translateSurvey`.
- Giới hạn đã biết: (1) báo cáo PDF/Word sinh ở trình duyệt dùng câu hỏi đã dịch lẫn nhãn tiếng Việt cho tới GĐ6; (2) lúc chưa có bản dịch, phần đó hiện tiếng Việt cho người xem đầu tiên; (3) tiêu đề và mô tả SEO của bài (`postMetadata`) đã dùng chữ dịch nhưng vẫn `noindex` cho tới GĐ5; (4) bản dịch tự động chưa kiểm chứng với `LanguageApp` thật, nên cần xem thử thuật ngữ và sửa tay trong tab.
- Đã kiểm tra: typecheck, lint, `i18n:check` 0 thiếu; chạy Next với Apps Script giả (dịch bằng tiền tố ngôn ngữ, lưu trong RAM): lượt 1 trả tiếng Việt và kích hoạt dịch nền, lượt 2 trả bản dịch cho cả bộ câu hỏi, bài viết (đoạn chữ, đậm giữ khoảng trắng, mô tả và chú thích ảnh, số "2024" không dịch) ở fr và zh; thuật ngữ "khí nhà kính" thay đúng ("gaz à effet de serre", "温室气体") và tên trụ cột lấy từ glossary; chỉ 1 lần `listTranslations` trong 5 phút. Chưa kiểm tra: `LanguageApp` thật, Sheet thật, `pnpm build`.

### GĐ4 - Sửa lỗi lẫn tiếng Việt và phải reload nhiều lần (10/11/2026): đã làm, chờ Bình test
- Nguyên nhân: `LanguageApp` chậm (khoảng 0,5-1 giây mỗi câu) nên dịch nền theo từng đợt 20 câu nối đuôi mất nhiều phút, mỗi lần reload mới thêm một ít; ngoài ra mỗi máy chủ serverless giữ bộ nhớ riêng 5 phút nên máy khác vẫn thấy bản cũ.
- Sửa 1 - chờ có giới hạn: khi gặp câu chưa dịch, trang tải lại bộ nhớ từ Sheet (cách nhau tối thiểu 8 giây), nếu vẫn thiếu thì dịch ngay, tối đa 4 đợt chạy song song, mỗi đợt 10 câu, và chờ tối đa 8 giây trước khi trả trang; phần chưa xong tiếp tục chạy nền. Các yêu cầu đồng thời dùng chung việc đang chạy, không dịch trùng. Bộ nhớ RAM giảm còn 1 phút và gộp thêm thay vì thay thế.
- Sửa 2 - dịch sẵn: trang mới `/quan-tri/ban-dich` (link "Bản dịch" trên thanh quản trị) có nút "Dịch sẵn nội dung" dịch toàn bộ bộ câu hỏi, bài viết đã đăng và nhãn số liệu sang en, fr, zh; mỗi lượt gọi `POST /api/admin/translations` chạy tối đa khoảng 40 giây và trang tự gọi lại tới khi xong. Chạy một lần sau khi triển khai và mỗi khi đổi nội dung lớn.
- Đã kiểm tra: typecheck, lint, `i18n:check` 0 thiếu; Apps Script giả có độ trễ 1,5 giây mỗi lượt dịch: 40 câu xong trong 1,6 giây ở lượt đầu, lượt sau 0 ms; 100 câu với giới hạn chờ 2 giây trả 80 câu rồi lượt kế tiếp đủ 100. Chưa kiểm tra: `LanguageApp` thật, `pnpm build`, giới hạn thời gian hàm của Vercel (gói miễn phí có thể thấp hơn 60 giây, khi đó nút vẫn chạy nhưng cần bấm lại).

### GĐ5 - SEO đa ngôn ngữ và dọn bản dịch mồ côi (10/11/2026): đã làm, chờ Bình test
- Mở index: `INDEXABLE_LOCALES = ["vi","en","zh","fr"]` (`features/locale/constants.ts`), các trang `/en`, `/zh`, `/fr` không còn `noindex`. Trang `mua-tin-chi-carbon`, `trong-rung`, `cong-cu-ai` giữ nguyên chế độ cũ (`noindex` hoặc bị chặn trong `robots.ts`).
- `lib/seo.ts`: `pageMetadata` nhận `locale`, đặt `canonical` về chính URL của ngôn ngữ đó (có tiền tố), `alternates.languages` cho `vi`, `en`, `zh-CN`, `fr` và `x-default` (về tiếng Việt, không tiền tố), `og:locale` + `og:locale:alternate`. `breadcrumbJsonLd(items, locale)` đặt URL theo ngôn ngữ. Hàm dùng chung: `localeLanguages`, `localeAlternates`, `openGraphLocales`.
- Tiêu đề và mô tả trang (trang chủ, Thành tựu, Tin tức), tagline và mô tả site, tên breadcrumb đều đi qua `t(...)` nên dịch theo `i18n:sync`; bài viết dùng tiêu đề và tóm tắt đã dịch từ GĐ4. Các trang chuyển từ `export const metadata` sang `generateMetadata`. `app/[locale]/layout.tsx` dựng metadata theo ngôn ngữ. JSON-LD (Organization, WebSite, Article, BreadcrumbList) có `inLanguage` và URL theo ngôn ngữ.
- `app/sitemap.ts`: mỗi trang xuất hiện 4 lần (mỗi ngôn ngữ một URL), mỗi dòng có đủ `xhtml:link` hreflang.
- Dọn mồ côi: `Code.gs` thêm hành động `pruneTranslations` (nhận danh sách mã băm đang dùng, xóa dòng không còn dùng trong tab "Bản dịch"; từ chối danh sách rỗng). Phía web (`server/translation/warm.ts`) gom chữ của bộ câu hỏi, mọi bài (kể cả nháp) và nhãn số liệu làm danh sách cần giữ; nếu lấy bộ câu hỏi hoặc bài lỗi thì dừng, không xóa gì. Dọn tự chạy nền sau khi lưu/xóa bài và lưu số liệu, và chạy cuối nút "Dịch sẵn nội dung". Dòng có chữ ở cột sửa tay luôn được giữ lại kể cả khi chữ gốc không còn dùng (xóa tay nếu muốn).
- Quy ước chung từ nay: tính năng nào lưu dữ liệu lên Google Sheet/Drive đều phải kèm cơ chế dọn dữ liệu mồ côi.
- Đã kiểm tra: typecheck, lint, `i18n:check` 0 thiếu (7 chuỗi mới nhập tay); chạy Next và xem head: canonical đúng theo ngôn ngữ, đủ hreflang và `x-default`, `og:locale` đúng, `lang` đúng, không còn `noindex`; sitemap có đủ 4 ngôn ngữ kèm hreflang; mô phỏng Sheet cho `pruneTranslations_`: xóa 3 dòng mồ côi, giữ dòng có sửa tay và dòng đang dùng, từ chối danh sách rỗng. Chưa kiểm tra: Sheet và `LanguageApp` thật, `pnpm build`, Google Search Console.
- Giới hạn đã biết: (1) bài hoặc câu chưa dịch vẫn hiện tiếng Việt trên URL ngôn ngữ khác nên có thể bị coi là nội dung trùng; hãy bấm "Dịch sẵn nội dung" trước khi gửi sitemap; (2) PDF/Word vẫn lẫn nhãn tiếng Việt cho tới GĐ6; (3) việc Google chọn hiển thị ngôn ngữ nào còn phụ thuộc Google, hreflang chỉ là gợi ý.

### GĐ6 đợt 1 - Tự động dịch, không cần bấm nút (10/11/2026): đã làm, chờ Bình test
- Lớp 1 (tự động khi lưu): sau khi lưu hoặc xóa bài và lưu số liệu, web dịch nền chữ mới sang en, fr, zh (tối đa khoảng 40 giây) rồi dọn dòng mồ côi. Các route lưu có `maxDuration = 60`. Hàm: `scheduleTranslationMaintenance()` trong `server/translation/warm.ts`.
- Lớp 2 (định kỳ, cho Sheet câu hỏi): endpoint `GET|POST /api/cron/translations` (`?prune=1` để dọn khi đã dịch xong), bảo vệ bằng `Authorization: Bearer <CRON_SECRET>`; trả `{ done, remaining, locales, pruned }`, chưa đặt `CRON_SECRET` thì trả 503, sai khóa trả 401. Biến môi trường mới: `CRON_SECRET` (tối thiểu 16 ký tự).
- Apps Script gọi endpoint: `installTranslationTriggers()` (chạy tay một lần) tạo trigger 10 phút một lần và trigger khi sửa Sheet (không tính tab "Bản dịch"). Sửa Sheet chỉ đặt cờ `TRANSLATION_DIRTY`; mỗi 10 phút nếu có cờ (hoặc đã quá 24 giờ) thì `runTranslationSync()` gọi endpoint lặp tối đa 6 vòng/4,5 phút tới khi `done`, chưa xong thì giữ cờ để lượt sau làm tiếp. Cần hai Script Properties: `WEB_BASE_URL`, `WEB_CRON_SECRET` (trùng `CRON_SECRET`).
- Có thể dùng Vercel Cron thay thế (`vercel.json`, gửi `Authorization: Bearer $CRON_SECRET` tự động) nhưng gói miễn phí chỉ chạy tối đa mỗi ngày một lần.
- Đã kiểm tra: typecheck, lint; endpoint trả 401 khi thiếu hoặc sai khóa, 503 khi chưa đặt khóa, qua được xác thực với khóa đúng (lỗi 502 do sandbox không có Sheet); mô phỏng Apps Script: xong sau 3 vòng thì ghi mốc chạy và xóa cờ, tiến độ đứng yên thì dừng và giữ cờ. Chưa kiểm tra: Apps Script, Vercel và `LanguageApp` thật.
- Đợt 2 (còn lại của GĐ6): báo cáo PDF/Word theo ngôn ngữ và phông chữ Hán.

## Hướng dẫn nhanh về bản dịch cho người quản trị (đọc trước khi hỏi)
- **Có cả bản tự động (`en`) và bản sửa tay (`en (sửa tay)`) thì web dùng bản nào?** Bản sửa tay. Ô sửa tay trống thì web dùng bản tự động. Dịch tự động không bao giờ ghi đè cột sửa tay.
- **Sửa tay xong bao lâu thì web đổi?** Tối đa khoảng 1 phút.
- **Đổi chữ gốc tiếng Việt thì sao?** Câu mới có mã băm mới nên được dịch lại từ đầu, bản sửa tay của câu cũ không tự theo sang câu mới (cần nhập lại ở dòng mới).
- **Thêm hoặc sửa câu hỏi trong Sheet câu hỏi có tự dịch không?** Có. Bấm "Dịch sẵn nội dung" ở `/quan-tri/ban-dich` hoặc để người xem đầu tiên kích hoạt (chờ tối đa 8 giây, phần còn lại dịch nền).
- **Xóa bài viết hoặc đổi chữ thì dòng dịch cũ có bị dọn không?** Có, tự động sau khi lưu/xóa bài hoặc số liệu, và khi bấm "Dịch sẵn nội dung". Dòng có chữ sửa tay thì được giữ.
- **Muốn xóa hẳn một dòng có sửa tay đã mồ côi?** Xóa tay dòng đó trong tab "Bản dịch".
- **Web đang hiện lẫn tiếng Việt?** Thường tự hết sau vài phút (lưu bài thì dịch ngay, sửa Sheet câu hỏi thì trigger Apps Script dịch trong tối đa 10 phút). Muốn dịch ngay thì bấm "Dịch sẵn nội dung" và giữ trang mở tới khi báo xong.
- **Muốn đổi cách dịch một thuật ngữ cho cả website?** Sửa `src/i18n/glossary.json` (`keep`, `exact`, `terms`).
- **Thêm chữ cố định mới trong code?** Bọc bằng `t("...")` hoặc `msg("...")`, chạy `pnpm dev` hoặc `pnpm build` (tự đồng bộ) và commit file trong `src/i18n/messages/`.

## 5. Rủi ro đã biết
- Header quốc gia chỉ có khi chạy trên Vercel; chạy máy cá nhân dùng `?lang=` hoặc `Accept-Language`. Cloud của Claude không truy cập được Google, nên phần Apps Script chỉ thử được trên bản giả lập.
- Dịch máy có thể sai thuật ngữ ESG: có từ điển cho chữ cố định; nội dung động sửa tay được trong tab "Bản dịch".
- Chuyển tuyến vào `app/[locale]` và thêm tiền tố cho mọi liên kết nội bộ là thay đổi lớn nhất của GĐ1; cần test kỹ liên kết, chuyển hướng và cảnh báo rời trang (`leave-guard`).
- Chuỗi có biến hoặc ghép phải chuyển sang dạng có tham số, nên GĐ3 sửa nhiều file nhưng mỗi chỗ nhỏ.
