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
**GĐ5 - SEO**: metadata, JSON-LD, `og:locale`, `hreflang`, canonical, sitemap theo ngôn ngữ.
**GĐ6 - Báo cáo**: `copy.ts`, nhãn, câu diễn giải theo ngôn ngữ; phông chữ Hán; Word.
**GĐ7 - Rà soát**: typecheck, lint, test, cập nhật README và tài liệu bàn giao.

## 4.1 Tiến độ

**GĐ1 (09/11/2026): đã làm, chờ Bình test trên máy thật.** Quyết định đã chốt: tiếng Việt không tiền tố, `/en` `/fr` `/zh` cho ba ngôn ngữ còn lại; `/vi/...` chuyển 308 về địa chỉ không tiền tố.

- Mã: `src/proxy.ts` (chọn ngôn ngữ lần đầu theo header `x-vercel-ip-country` hoặc `cf-ipcountry`, rồi `Accept-Language`, rồi en; bot không bị chuyển hướng; cookie `esg-locale` 1 năm; `?lang=xx` để ép/thử); `features/locale/{constants,lib/path,lib/detect,lib/persist-locale,hooks/use-locale,components/locale-link,components/language-switcher}`; `app/[locale]/layout.tsx` là root layout (html lang theo ngôn ngữ, `noindex` cho ngôn ngữ chưa dịch qua `INDEXABLE_LOCALES = ["vi"]` ở `locale/constants.ts`, **GĐ5 phải mở cho en/fr/zh khi đã dịch xong**); `app/quan-tri/layout.tsx` thành root layout riêng; `GuardedLink`, `LocaleLink`, `useLocalePath` tự thêm tiền tố.
- Cookie theo "ngôn ngữ trang đang xem gần nhất": proxy đặt khi phát hiện lần đầu; `LanguageSwitcher` đặt khi bấm đổi và đồng bộ khi mở trang có tiền tố.
- Đổi ngôn ngữ qua `LanguageSwitcher` đi qua hộp cảnh báo rời trang (leave-guard) nếu đang có bản nháp chưa lưu; hộp này vẫn tiếng Việt cho đến GĐ3.
- Chưa làm trong GĐ1 (cố ý): dịch chữ giao diện (GĐ2-3), `hreflang`/sitemap theo ngôn ngữ (GĐ5), phông chữ Hán (biến `--font-noto-sans-sc` hiện không được dùng ở đâu; chữ Hán dùng phông hệ thống nhờ `lang="zh-CN"`), `global-not-found` (URL không khớp tuyến nào hiện hiện trang 404 mặc định của Next).
- Đã kiểm tra: typecheck, lint, 27 tình huống chuyển hướng bằng curl, 18 kiểm tra trình duyệt bằng Playwright. Chưa kiểm tra được: `pnpm build` (sandbox không tải được phông Google), luồng leave-guard thật (sandbox không đọc được Google Sheet nên không dựng được màn khảo sát), header quốc gia thật của Vercel.
