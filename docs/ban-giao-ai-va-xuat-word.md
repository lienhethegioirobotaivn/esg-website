# Bàn giao bổ sung: công cụ AI điền dữ liệu thử và xuất Word (cập nhật 07/11/2026)

Đọc cùng `boi-canh-du-an.md` (bối cảnh chung) và `quy-trinh-du-lieu-thu-ai.md` (cách dùng công cụ AI).

## 1. Cách làm việc phát sinh
- Môi trường làm việc của Claude là bản sao repo trên cloud, **không phải** repo thật của Bình (`D:\workspace\esg-website`, Windows, PowerShell, VS Code). Thay đổi giao qua **file zip đặt đúng đường dẫn trong repo**; Bình giải nén đè rồi chạy. Không commit hay push từ cloud; Bình đã nói bỏ qua nhắc nhở commit.
- Sandbox không truy cập được Google/Gemini; Bình chạy thật trên máy mình. Claude chỉ kiểm tra được typecheck, lint và chạy thử offline.
- Khi cần kiểm tra Word: dựng bundle bằng esbuild (`--external:buffer`), chạy trong Chromium qua Playwright, mở bằng LibreOffice để xem ảnh.

## 2. Công cụ AI điền dữ liệu thử (trang `/cong-cu-ai`)
- Mục đích: người không rành kỹ thuật chọn doanh nghiệp + PDF báo cáo, bấm "Chạy AI" để tự điền khảo sát, rồi thử xuất báo cáo. Dùng gói **miễn phí** của Gemini.
- Bật bằng `apps/web/.env.local`: `ENABLE_AI_TOOLS=true`, `GEMINI_API_KEY`, tùy chọn `GEMINI_MODEL` (mặc định `gemini-3.8-flash`). Tắt thì trang trả 404. **Không bật trên production.**
- Luồng: đọc chữ trong PDF (thư viện `unpdf`) → Gemini JSON mode (không dùng công cụ tìm kiếm vì gói miễn phí trả 429 khi dùng search grounding) → kiểm tra từng câu trích nguyên văn có thật trong PDF (loại câu bịa, số không có trong trích dẫn, sửa số trang) → ghi bản nháp vào `localStorage` khóa `esg-studio:draft` → "Nạp vào khảo sát và mở".
- **Câu AI không tìm thấy được tự chọn phủ định** để khảo sát đủ 100%: Có/Chưa có → Chưa có; Sự cố, Có/Không → Không; số liệu, bảng → Chưa có số liệu; văn bản → Chưa rõ kèm ghi chú "Báo cáo không nêu thông tin này". Không dùng "Không áp dụng" vì bắt buộc nhập lý do. Giao diện: dòng nền vàng = AI tìm thấy, mục nền xám = mặc định phủ định, mục riêng cho câu bị loại.
- Mạng/độ ổn định: tự thử lại khi lỗi mạng (3 lần), 429 (chờ 65 giây, 1 lần), 500/503/504 (chờ 20/40/60 giây). Thông báo lỗi có mã nguyên nhân thật.
- Mã: `apps/web/src/server/ai-data/*` (gemini, verify, pdf, prompts, build-draft, run-ai-data), `app/api/ai-data/run/route.ts` (NDJSON stream), `features/ai-data/*` (catalog 3 doanh nghiệp mẫu: VinUni, SJ1, Toyota Việt Nam; link PDF chưa được tải thử), `app/(public)/cong-cu-ai/page.tsx`.
- Hạn chế đã biết: kiểm tra trích dẫn chỉ chống bịa chữ, không đảm bảo đúng năm hoặc đúng phạm vi (tập đoàn so với công ty); gói miễn phí khoảng 20 lượt gọi mỗi ngày; chỉ đọc một phần PDF nếu báo cáo dài (có tùy chọn trang).
- Chưa làm: đánh dấu dữ liệu AI trong Sheet "Data khách hàng" (cần cột mới và sửa Apps Script); tô vàng câu do AI điền ngay trong màn khảo sát (cần trường đánh dấu trong bản nháp).
- Tệp `tools/esg-agents` và thay đổi `pnpm-workspace.yaml` của cách làm bằng dòng lệnh cũ đã bị thay thế, Bình cần xóa/khôi phục trong repo thật.

## 3. Xuất báo cáo: hộp thoại tải về và file Word
- Bấm "Tạo báo cáo": kiểm tra như cũ (thiếu thì hiện danh sách). Đủ thì mở hộp thoại `report-download-dialog.tsx` với nút Tải PDF, Tải Word, nhãn "Bản nháp" và khung giải thích lý do bản nháp, mỗi lý do có nút "Đi tới đây để điền" (đóng hộp thoại rồi nhảy tới câu/ô tương ứng, dùng chung cơ chế với khung vàng cuối trang). Nút "Xem bản nháp" cũ vẫn xem trước PDF.
- Hook `use-report-export.ts`: `exportReport` (kiểm tra + lưu doanh nghiệp + mở hộp thoại), `downloadReport(format)`. `create-report.ts` có `createReportBlob` (PDF) và `createReportDocxBlob` (Word) dùng chung `prepareReport`. Tên file có đuôi `pdf` hoặc `docx` (`report-file-name.ts`).
- Word: `report/generate-docx.ts`, thư viện `docx@9.5.1`, dựng từ cùng `ReportModel` với PDF. Bảng dùng độ rộng cố định theo DXA (độ rộng phần trăm làm Word nén cột). Có bìa, khung nhận định, ô số liệu lớn, biểu đồ thanh vẽ bằng canvas thành ảnh, ảnh minh chứng, đủ các mục R01 đến R07. Mục không có dữ liệu tự bỏ qua. Khác PDF: không có mục lục, bìa không có nền màu, không có sơ đồ chuỗi cung ứng, ngắt trang do Word quyết định, biểu đồ là ảnh không sửa được.
- Cần Bình xác nhận bằng báo cáo thật mở trên Word: các bảng dài có lệch bố cục không.

## 4. Việc tồn đọng cho phiên mới
- Commit (Bình sẽ tự làm): gợi ý một commit `feat(web): add AI-assisted sample data tool for ESG survey` và một commit `feat(survey): add Word export and download dialog for reports`; nhớ kèm `pnpm-lock.yaml` (thêm `unpdf`, `docx`).
- `pnpm build` thật chưa chạy (sandbox không tải được phông Google).
- Các việc hoãn ở mục 8 của `boi-canh-du-an.md` vẫn nguyên.

## 5. Bắt đầu phiên mới
1. Mở cuộc trò chuyện mới trong Project "esg website" (tài liệu Project tự có trong ngữ cảnh).
2. Gửi file zip repo hiện tại của Bình (không kèm `node_modules`, `.next`, `.env*`), vì bản sao cloud có thể cũ hơn repo thật.
3. Nói rõ việc cần làm; nếu là bước tiếp của hai phần trên, trích mục "Chưa làm" hoặc "Cần Bình xác nhận".
