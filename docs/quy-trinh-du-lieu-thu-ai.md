# Quy trình dữ liệu thử bằng AI (cho người không rành kỹ thuật)

Công cụ nằm ở trang `/cong-cu-ai` của web, chỉ dùng nội bộ để thử báo cáo PDF.
- **AI 1** đọc báo cáo PDF của một doanh nghiệp và trả lời bộ câu hỏi ESG.
- **AI 2** đối chiếu từng câu với tài liệu gốc (câu trích dẫn sai bị loại) rồi điền vào khảo sát.
- Dữ liệu AI tìm thấy được **tô vàng** để rà soát.
- Câu AI không tìm thấy trong báo cáo được tự chọn phủ định (Chưa có / Không / Chưa có số liệu; câu dạng văn bản ghi "Báo cáo không nêu thông tin này"), liệt kê riêng ở mục "Tự chọn phủ định" (nền xám). Nhờ vậy khảo sát luôn đầy đủ 100% để xuất báo cáo.

## Cài đặt một lần (người có kỹ thuật làm)
1. Lấy khóa miễn phí tại https://aistudio.google.com/apikey (Create API key).
2. Tạo `apps/web/.env.local`:
   ```
   ENABLE_AI_TOOLS=true
   GEMINI_API_KEY=khóa_của_bạn
   ```
   (Tùy chọn: `GEMINI_MODEL=gemini-3.8-flash`.)
3. Chạy `pnpm install`, rồi `pnpm dev`.
4. Không đặt `ENABLE_AI_TOOLS=true` trên Vercel/production. Khi tắt, trang trả về 404.

## Cách dùng hằng ngày (ai cũng làm được)
1. Mở `http://localhost:3000/cong-cu-ai`.
2. Bấm tên một doanh nghiệp trong danh sách có sẵn, hoặc tự nhập: tên, năm, lĩnh vực, quy mô, và đường dẫn PDF (hoặc chọn tệp PDF trên máy). Chưa có PDF: bấm "Mở Google để tìm tệp PDF".
3. Bấm **Chạy AI**, chờ 1 đến 3 phút.
4. Xem bảng kết quả (nền vàng = AI điền). Đối chiếu với báo cáo gốc.
5. Bấm **Nạp vào khảo sát và mở** để khảo sát được điền sẵn, rồi xuất PDF để thử báo cáo.

## Lưu ý
- Gói miễn phí giới hạn lượt gọi (khoảng 20 lượt/ngày với model mặc định). Gặp lỗi 429 thì đợi rồi chạy lại.
- Báo cáo quá dài: mở "Tùy chọn nâng cao" và nhập các trang cần đọc (ví dụ 60-160).
- Việc khớp trích dẫn chỉ đảm bảo AI không bịa chữ, chưa đảm bảo đúng năm hay đúng phạm vi (tập đoàn so với công ty). Luôn rà soát.
- Chưa làm: đánh dấu dữ liệu AI trong Sheet "Data khách hàng" và tô vàng ngay trong màn khảo sát.
