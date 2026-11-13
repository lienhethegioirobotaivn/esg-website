# Kế hoạch tính năng: báo cáo theo bộ nhận diện thương hiệu (cập nhật 13/11/2026)

Trạng thái: đã lập kế hoạch, chưa code. Các quyết định ở mục 4 là đề xuất mặc định, chờ Bình chốt. Đọc cùng `boi-canh-du-an.md` (mục 7: báo cáo PDF) và `ban-giao-ai-va-xuat-word.md` (mục 3: xuất Word).

## 1. Yêu cầu

- Người dùng tải lên bộ nhận diện thương hiệu của doanh nghiệp, **nhiều ảnh** (logo, bảng màu, mẫu danh thiếp, slide, website...).
- AI (Google Gemini, `GEMINI_API_KEY`, model `gemini-3.5-flash-lite` đã có trong `apps/web/.env.local`) xem các ảnh và đề xuất **giao diện** của báo cáo PDF và Word cho hợp với thương hiệu.
- Làm theo giai đoạn do Bình ra lệnh. Mỗi giai đoạn trả về: file nén các file đã đổi (đúng đường dẫn repo), cách thực hiện, cách test, commit message.

## 2. Hiện trạng trong repo (đã đọc)

- Màu PDF nằm trong hằng `COLORS` và `styles = StyleSheet.create(...)` ở mức module trong `features/survey/report/theme.ts`; `pdf-parts.tsx` (36 chỗ) và `report-document.tsx` (17 chỗ) dùng trực tiếp. Màu trụ cột E/S/G (`PILLAR_COLORS`) và màu SDG là hằng riêng trong `pdf-parts.tsx`.
- Word (`generate-docx.ts`, 1.090 dòng): màu là hằng `INK`, `MUTED`, `GREEN` (thực chất là navy `102642`), `BLUE`, `SOFT`, `LINE` cùng vài mã `#...` ghi thẳng cho biểu đồ canvas và trạng thái. Phông cố định `Arial`.
- Phông PDF: DejaVu Sans (vi, en, fr) và Noto Sans SC (zh), đăng ký ở `report/fonts.ts`. Chỉ có **một** họ chữ có chân không dấu cho tiếng Việt.
- Trang bìa PDF nằm trong `report-document.tsx` (quanh dòng 200-250), Word ở hàm `cover(...)` trong `generate-docx.ts`; cả hai đã nhận `logo: ReportLogo | null`.
- Logo: state `logo: File | null` ở `survey-workspace.tsx`, truyền xuống `useReportExport` và `useReportPreview`; `prepareReportLogo` thu nhỏ bằng canvas. Ảnh minh chứng tương tự, **không** lưu trong bản nháp.
- Cơ chế sẵn có để bắt chước: `report-text-context.tsx` (Provider đưa `t` xuống cây PDF), `lib/plan-storage.ts` (lưu localStorage theo khóa `-v1`, xóa khi "Làm báo cáo mới"), `create-report.ts` (`prepareReport` dùng chung cho PDF và Word).
- Gemini: `server/ai-data/gemini.ts` chỉ gửi **văn bản** (`parts: [{ text }]`), JSON mode, có thử lại 429/5xx. Chưa có gửi ảnh. `server/env.ts` đã có `GEMINI_API_KEY`, `GEMINI_MODEL`; cổng `ENABLE_AI_TOOLS` chỉ dành cho công cụ nội bộ `/cong-cu-ai`, **không** dùng cho tính năng hướng tới khách.
- Lưu ý: file nén repo bạn gửi có kèm `apps/web/.env.local` và `tools/esg-agents/.env` (chứa khóa Gemini). Lần sau loại các file `.env*` khỏi file nén; nếu đã chia sẻ file nén ở đâu khác thì nên tạo lại khóa.

## 3. Nguyên tắc thiết kế

1. **AI đề xuất, mã kiểm soát.** AI không viết CSS hay bố cục tự do. AI chỉ trả về JSON theo schema (zod) gồm: vai trò màu, nhóm phông, và các lựa chọn bố cục lấy từ một **danh sách đóng**. Mọi giá trị đều được kiểm tra và chỉnh lại bằng mã (tương tự cách `verify.ts` loại câu bịa của công cụ AI nhập liệu).
2. **Màu lấy từ ảnh thật.** Trình duyệt tự trích bảng màu chủ đạo bằng canvas trước, gửi kèm cho AI làm gợi ý. Màu AI trả về phải trùng (hoặc rất gần) một màu đã trích, nếu không thì kéo về màu gần nhất. Không có màu "bịa".
3. **Đảm bảo đọc được.** Mã tự kiểm tra độ tương phản (chữ trắng trên màu chính, chữ trên nền nhạt), tự làm đậm hoặc làm nhạt khi chưa đạt. Màu trạng thái Có / Một phần / Chưa có giữ nguyên ngữ nghĩa, **không** đổi theo thương hiệu.
4. **Luôn có đường lui.** Không có ảnh, AI lỗi, hết lượt miễn phí (429), hoặc người dùng bấm "Dùng giao diện mặc định" thì báo cáo ra đúng như hiện nay (bìa trắng, navy). Kết quả với theme mặc định phải **giống hệt** báo cáo hiện tại.
5. **Người dùng duyệt trước khi xuất.** Kết quả AI hiện thành bản xem trước (bảng màu, bìa mini) và chỉnh được từng màu. Không tự áp dụng âm thầm.
6. **Một nguồn sự thật cho PDF và Word.** Theme là kiểu dữ liệu thuần ở `@esg/shared` (kèm test), PDF và Word cùng đọc từ đó.
7. **Chỉ dữ liệu nhỏ được lưu.** Chỉ JSON theme (vài trăm byte) lưu localStorage khóa `esg-brand-theme-v1`, xóa khi "Làm báo cáo mới". Ảnh thương hiệu **không** lưu (giống ảnh minh chứng). Vì không đưa gì lên Google Sheet hay Drive nên chưa cần dọn dữ liệu mồ côi; nếu sau này lưu lên Drive thì phải kèm dọn mồ côi (quy ước dự án).
8. **Đa ngôn ngữ.** Mọi chữ giao diện mới đi qua `t(...)` / `msg(...)`; theme không chứa chữ do AI viết (chỉ mã và enum) nên không cần dịch nội dung AI. Làm theo checklist mục 9 của `docs/da-ngon-ngu.md`. Bản tiếng Trung luôn dùng Noto Sans SC bất kể nhóm phông.

## 4. Quyết định cần chốt (mặc định đề xuất)

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| 1 | Loại tệp đầu vào | Chỉ ảnh PNG, JPG, WEBP; tối đa 6 ảnh, mỗi ảnh 5 MB. Chưa nhận PDF brand guideline |
| 2 | Vị trí giao diện | Thẻ tùy chọn "Giao diện báo cáo theo thương hiệu" ở màn rà soát, ngay trên hai nút xuất (cạnh thẻ Kế hoạch cải thiện). Logo vẫn tải ở form doanh nghiệp |
| 3 | Lưu trữ | Chỉ JSON theme ở localStorage; ảnh không lưu; không đưa lên Sheet/Drive |
| 4 | AI được quyết định gì | Màu (chính, nhấn, nền nhạt, nền đậm), nhóm phông (không chân hoặc có chân), và bố cục từ danh sách đóng (kiểu bìa, kiểu tiêu đề bảng, kiểu ô số liệu, độ bo góc, mật độ). Không bố cục tự do |
| 5 | Bìa nền màu | Trước đây đã chốt "bìa nền trắng, không dùng màu xanh" cho giao diện mặc định. Đề xuất: giữ nguyên cho mặc định; với giao diện thương hiệu cho phép bìa có dải màu hoặc nền màu theo thương hiệu |
| 6 | Quyền riêng tư | Ảnh gửi tới Google Gemini. Hiện thông báo ngắn trước khi phân tích và yêu cầu tích đồng ý (theo điều khoản gói miễn phí hiện hành, Google có thể dùng dữ liệu để cải thiện sản phẩm; cần Bình kiểm tra lại điều khoản khi triển khai) |
| 7 | Hạn mức | Gói miễn phí khoảng 20 lượt/ngày dùng chung cho mọi khách. Đặt trần theo ngày và theo IP; khi hết thì **dự phòng không cần AI**: chỉ dùng bảng màu trích bằng mã để tạo theme |
| 8 | Tên model | Dùng `GEMINI_MODEL` hiện có (`gemini-3.5-flash-lite`), cho phép ghi đè bằng `GEMINI_BRAND_MODEL`. Phải kiểm tra thật rằng model này nhận ảnh (bước thử ở GĐ3) |
| 9 | Cờ bật tắt | Biến mới `ENABLE_BRAND_THEME` (mặc định tắt) tách khỏi `ENABLE_AI_TOOLS`, để bật riêng trên production khi sẵn sàng |

## 5. Các giai đoạn

### GĐ1 - Theme động cho PDF và Word (nền móng, chưa có AI)
**Việc**
- `@esg/shared`: `report-theme.ts` gồm schema zod `ReportTheme`, `DEFAULT_REPORT_THEME` (đúng bằng màu hiện tại), hàm dẫn xuất các sắc độ phụ (nền nhạt, đường kẻ, chữ nhạt) từ vài màu gốc, hàm kiểm tra tương phản và tự chỉnh.
- PDF: biến `theme.ts` thành `createStyles(theme)`; thêm `ReportThemeProvider` / `useReportTheme()` giống `report-text-context.tsx`; sửa `pdf-parts.tsx` và `report-document.tsx` lấy màu từ theme thay cho `COLORS`.
- Word: thay `INK`, `MUTED`, `GREEN`, `BLUE`, `SOFT`, `LINE` và mã hex ghi thẳng bằng giá trị từ theme (biểu đồ canvas, ô số liệu, tiêu đề bảng).
- `create-report.ts` đọc theme từ `lib/brand-theme-storage.ts` (mới, theo mẫu `plan-storage.ts`), không có thì dùng mặc định.
**Đầu ra**: báo cáo mặc định giống hệt cũ; dán JSON theme vào localStorage thì PDF và Word đổi màu.
**Test**: test `tsx --test` cho schema, dẫn xuất, tương phản; so sánh PDF và Word mặc định trước và sau (không đổi); dán 3 theme thử (đỏ cam, xanh lá, vàng nhạt có chữ cần chỉnh tương phản) bằng DevTools rồi xuất PDF và Word.

### GĐ2 - Phông và các kiểu bố cục
**Việc**
- Thêm họ chữ có chân (đề xuất DejaVu Serif, hỗ trợ tiếng Việt, giấy phép tự do) vào `public/fonts` và `fonts.ts`; Word dùng Georgia hoặc Cambria cho nhóm có chân. Tiếng Trung giữ Noto Sans SC.
- Danh sách đóng các biến thể trong `ReportTheme.layout`: kiểu bìa (trắng hiện tại, dải màu trên, thanh bên trái, nền màu), kiểu tiêu đề bảng (nền đặc, gạch chân), kiểu ô số liệu (nền đậm, viền), độ bo góc, mật độ khoảng cách. Áp cho cả PDF và Word.
- Bìa dùng logo theo từng kiểu (logo trắng trên nền đậm cần xử lý: nền sáng đệm quanh logo khi logo tối).
**Đầu ra**: cùng một báo cáo có thể xuất theo nhiều kiểu bằng cách đổi JSON.
**Test**: xuất PDF và Word với từng kiểu bìa và từng kiểu bảng; kiểm tra bìa có và không có logo, có và không có "BẢN NHÁP"; bản tiếng Trung không vỡ dòng; mở Word trên máy thật xem bảng dài.

### GĐ3 - Đọc ảnh và đề xuất theme (máy chủ)
**Việc**
- Phía trình duyệt: kiểm tra loại và dung lượng, thu nhỏ mỗi ảnh về cạnh dài khoảng 1.024 px (JPEG) để tổng body dưới giới hạn của Vercel, trích bảng màu chủ đạo bằng canvas (`lib/extract-palette.ts`).
- Máy chủ: mở rộng client Gemini để gửi ảnh (`inlineData`) và dùng `responseSchema`; route `POST /api/brand-theme/analyze` (Node, `maxDuration`), prompt riêng tiếng Việt cho vai trò màu, nhóm phông, kiểu bố cục; kiểm tra bằng zod; kéo màu AI về màu gần nhất trong bảng màu đã trích; tự chỉnh tương phản; nếu AI lỗi hoặc hết lượt thì trả theme dự phòng dựng từ bảng màu.
- Bảo vệ: `ENABLE_BRAND_THEME`, giới hạn số ảnh, dung lượng, dò loại thật bằng `detect-image-type.ts`, giới hạn theo IP và theo ngày (bộ nhớ trong), thông báo lỗi bằng `msg(...)`.
- Công cụ thử cho người phát triển: lệnh chạy một thư mục ảnh qua đúng pipeline và in JSON theme (theo mẫu `tools/esg-agents/src/ping.ts`) để kiểm tra Gemini thật trên máy Bình.
**Đầu ra**: gửi vài ảnh, nhận JSON theme hợp lệ, ổn định, đã qua kiểm tra.
**Test**: test đơn vị cho trích màu, kéo màu, tương phản, schema (có Gemini giả); chạy công cụ thử với 5 bộ nhận diện thật (nhiều màu, đơn sắc, logo trắng nền trong suốt, ảnh mờ, ảnh không liên quan); thử 429 và mất mạng để thấy theme dự phòng; thử ảnh sai loại và vượt giới hạn.

### GĐ4 - Giao diện người dùng
**Việc**
- Thẻ "Giao diện báo cáo theo thương hiệu" ở màn rà soát: kéo thả hoặc chọn nhiều ảnh, hình thu nhỏ, xóa từng ảnh, thông báo quyền riêng tư kèm ô đồng ý, nút "Phân tích".
- Trạng thái: đang phân tích, lỗi (có nút thử lại), hết lượt (nêu rõ đang dùng bảng màu trích tự động).
- Bản xem trước theme: ô màu, bìa mini dựng bằng HTML, chỉnh từng màu, chọn kiểu bìa, nút "Dùng giao diện mặc định".
- Lưu JSON vào localStorage, xóa khi "Làm báo cáo mới"; `useReportExport` và `useReportPreview` tự áp dụng; hộp tải báo cáo và hộp xem trước hiện nhãn "Giao diện: thương hiệu / mặc định".
- Bọc toàn bộ chữ mới bằng `t(...)`, chạy `i18n:sync`, commit `src/i18n/messages/`.
**Đầu ra**: luồng đầy đủ từ tải ảnh đến tải PDF, Word theo thương hiệu.
**Test**: luồng đầy đủ ở `/`, `/en`, `/fr`, `/zh`; thử không đồng ý thì không gọi AI; làm báo cáo mới thì theme bị xóa; tải lại trang thì theme còn nhưng ảnh không còn; màn hình hẹp.

### GĐ5 - Hoàn thiện, kiểm thử và bàn giao
**Việc**: xuất thử đủ 4 ngôn ngữ x 2 định dạng x theme mặc định và thương hiệu; các trường hợp biên (màu chính quá sáng, thương hiệu đơn sắc, logo tối trên bìa tối); hiệu năng xuất; cập nhật README (biến mới), `.env.example`, `docs/da-ngon-ngu.md`, tài liệu bàn giao; `pnpm typecheck`, `pnpm lint`, test `@esg/shared`, `i18n:check`.
**Tùy chọn sau GĐ5 (chờ Bình quyết)**: cắt logo từ chính các ảnh thương hiệu khi chưa có logo; lưu bộ nhận diện lên Drive theo mã báo cáo (kèm dọn mồ côi); nhận PDF brand guideline.

## 6. Rủi ro đã biết

- Môi trường cloud của Claude không truy cập được Google/Gemini: phần gọi Gemini thật chỉ Bình chạy được; Claude kiểm tra bằng Gemini giả, typecheck, lint, test và xuất thử PDF/Word offline.
- Model nhỏ có thể trả màu hoặc kiểu không ổn định: đã có kéo màu về bảng màu trích, schema chặt và theme dự phòng.
- Gói miễn phí hạn mức thấp và dùng chung cho mọi khách: cần trần theo ngày và dự phòng không AI.
- Refactor `theme.ts` đụng nhiều chỗ nhất ở GĐ1: bắt buộc so sánh báo cáo mặc định trước và sau.
- Body của route trên Vercel bị giới hạn khoảng 4,5 MB: thu nhỏ ảnh phía trình duyệt bắt buộc.
- Tiếng Trung PDF: chỉ dùng Noto Sans SC; không dùng ký tự `-` ASCII ở chữ mới (xem `da-ngon-ngu.md` mục 5).
