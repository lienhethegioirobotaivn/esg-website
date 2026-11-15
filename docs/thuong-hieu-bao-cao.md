# Giao diện báo cáo theo thương hiệu

Tính năng tùy chọn: doanh nghiệp tải ảnh bộ nhận diện thương hiệu (logo, bảng màu, ấn phẩm), Google Gemini đề xuất màu, phông chữ và kiểu bố cục, và báo cáo PDF cùng Word được dựng theo đó. Kế hoạch và nhật ký từng giai đoạn: [ke-hoach-bao-cao-theo-thuong-hieu.md](ke-hoach-bao-cao-theo-thuong-hieu.md).

## 1. Bật và cấu hình

| Biến (`apps/web/.env.local`) | Ý nghĩa |
| --- | --- |
| `ENABLE_BRAND_THEME` | `true` mới hiện thẻ trên trang khảo sát và mở API. Mặc định tắt: API trả 404 |
| `GEMINI_API_KEY` | Dùng chung với công cụ AI nhập liệu |
| `GEMINI_BRAND_MODEL` | Model riêng cho tính năng này; bỏ trống thì dùng `GEMINI_MODEL` |
| `BRAND_AI_DAILY_LIMIT` | Trần số lần gọi AI mỗi ngày cho cả hệ thống (mặc định 30) |
| `BRAND_AI_IP_LIMIT` | Trần số lần gọi AI mỗi 10 phút trên một IP (mặc định 5) |
| `GEMINI_API_BASE_URL` | Chỉ để kiểm thử với Gemini giả |

Nếu theme đã lưu trong trình duyệt mà cờ bị tắt, báo cáo vẫn dùng theme đó; thẻ chỉ ẩn.

## 2. Luồng hoạt động

1. Trình duyệt: người dùng chọn tối đa 6 ảnh PNG, JPG hoặc WEBP (mỗi ảnh tối đa 5 MB). `prepare-images.ts` thu nhỏ còn tối đa 1024 px, xuất JPEG sao cho mỗi ảnh tối đa 1,2 MB và tổng tối đa 3,6 MB (giới hạn body của Vercel khoảng 4,5 MB), đồng thời đo bảng màu bằng canvas.
2. Gửi `multipart/form-data` (`images`, `palette`, `useAi`) tới `POST /api/brand-theme/analyze`. Giao diện luôn gửi `useAi=true` (đã bỏ ô đồng ý). API vẫn nhận `useAi=false` để thử: khi đó không gọi Gemini và trả theme từ bảng màu.
3. Máy chủ kiểm tra loại ảnh bằng chữ ký byte, kiểm tra bảng màu bằng zod, rồi gọi Gemini với ảnh, schema JSON chặt và danh sách lựa chọn đóng. Kết quả được kiểm lại bằng zod; màu AI chọn được kéo về màu gần nhất trong bảng màu đo từ ảnh.
4. Trả `{ source: "ai" | "palette", reason, theme, palette }`. Khi không dùng được Gemini, `source` là `palette` và `reason` là một trong `no-consent`, `not-configured`, `quota`, `error`; theme lấy từ bảng màu đo được.
5. Theme lưu ở `localStorage` khóa `esg-brand-theme-v1` (chỉ JSON theme, không lưu ảnh). `create-report.ts` đọc khóa này lúc xuất; `resolveReportTheme` bảo đảm độ tương phản (màu chính và màu nhấn đạt 4,5 so với nền trắng, chữ đạt 7) và trả về giao diện mặc định nếu dữ liệu sai.
6. "Làm báo cáo mới" xóa khóa này. Ảnh và theme không lên Sheet hay Drive, nên không có dữ liệu mồ côi cần dọn.

## 3. Các tệp chính

- `packages/shared/src/report-theme.ts`: kiểu và `resolveReportTheme`. `brand-theme.ts`: đo bảng màu, schema kết quả AI, `buildBrandTheme`, `themeFromPalette`, hằng giới hạn.
- `apps/web/src/features/survey/report/`: `theme.ts` và `report-theme-context.tsx` (PDF), `generate-docx.ts` (`applyTheme`, Word), `fonts.ts`.
- `apps/web/src/server/brand-theme/` và `app/api/brand-theme/analyze/route.ts`: máy chủ. `server/ai-data/gemini.ts` `generateJson` hỗ trợ ảnh và `responseSchema`.
- `apps/web/src/features/brand-theme/`: thẻ giao diện, hook, thu nhỏ ảnh, gọi API.
- Kiểm thử: `packages/shared/tests/{report-theme,brand-theme}.test.ts`, `apps/web/tests/brand-theme/analyze-brand.test.ts`. Thử với Gemini thật: `pnpm --filter web brand:try <thư mục ảnh> [--no-ai]`; lệnh in sẵn câu `localStorage.setItem(...)` để dán vào trình duyệt.

## 4. Quyền riêng tư và an toàn

- Ảnh chỉ đi qua máy chủ để gửi Gemini, không được lưu. Thẻ không còn hộp đồng ý hay chữ nhắc tới AI (quyết định ngày 15/11/2026): khi tính năng bật, ảnh luôn được gửi tới Google Gemini. Gói miễn phí của Google có thể dùng dữ liệu để cải tiến sản phẩm, nên nên ghi việc này ở chính sách quyền riêng tư của website, và đừng bật cho khách nếu họ cần giữ bí mật ảnh.
- Đầu ra của AI chỉ là hai màu và các lựa chọn trong danh sách đóng, nên chữ trong ảnh (kể cả chữ cố tình đưa lệnh cho AI) không thể đưa nội dung vào báo cáo.
- Hạn mức theo IP và theo ngày nằm trong bộ nhớ của từng instance: trên môi trường serverless chỉ là rào chắn gần đúng. Cần chặn chắc chắn thì dùng kho chung (Upstash, KV) hoặc cấu hình ở tầng WAF.

## 5. Giới hạn đã biết

- Màu quá sáng bị làm đậm để chữ trắng đọc được: vàng tươi thành vàng ô liu, màu gần trắng thành xám.
- Logo của doanh nghiệp là ảnh đã tải ở form thông tin, không phải ảnh thương hiệu. Logo chữ trắng trên nền trong suốt sẽ gần như không thấy vì được đặt trên ô trắng (PDF) hoặc trên trang trắng (Word).
- Bìa dạng khối màu (`solid`) trong Word là khối nằm trong lề trang, không tràn mép giấy như PDF. Bo góc chỉ có trong PDF.
- Phông có chân trong Word là Georgia, cần máy có phông này; Noto Sans SC trong PDF tiếng Trung chỉ có khoảng 7.500 chữ thông dụng.
- Model nhỏ có thể trả lựa chọn khác nhau giữa các lần chạy; người dùng chỉnh được màu và kiểu ngay trong thẻ.
- Gemini thật và Vercel thật chưa được kiểm tra trong môi trường phát triển của Claude (không truy cập Google): chạy `brand:try` trên máy bạn trước khi bật cho khách.

## 6. Xử lý sự cố

| Hiện tượng | Nguyên nhân và cách xử lý |
| --- | --- |
| Không thấy thẻ | `ENABLE_BRAND_THEME` chưa là `true` (cần khởi động lại `pnpm dev`) |
| Luôn ra giao diện cơ bản từ màu trong ảnh | Xem `reason` trong tab Network: `not-configured` (thiếu `GEMINI_API_KEY`), `quota` (hết hạn mức hoặc Gemini trả 429), `error` (xem log máy chủ, dòng bắt đầu bằng `brand-theme:`) |
| Lỗi 413 | Tổng ảnh sau thu nhỏ quá 3,6 MB; chọn ít ảnh hơn |
| Báo cáo không đổi màu | Mở Console, kiểm tra `localStorage["esg-brand-theme-v1"]`; xóa khóa này để về giao diện mặc định |
| Word hiện phông khác với PDF | Máy chưa cài Georgia (phông có chân) hoặc Microsoft YaHei (tiếng Trung) |

## 7. Việc có thể làm sau (chờ quyết định)

- Cắt logo từ chính ảnh thương hiệu khi doanh nghiệp chưa có logo.
- Lưu bộ nhận diện lên Drive theo mã báo cáo (kèm dọn dữ liệu mồ côi).
- Nhận PDF brand guideline.
- Kho đếm hạn mức dùng chung giữa các instance.
