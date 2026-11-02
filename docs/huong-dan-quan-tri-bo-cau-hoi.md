# Hướng dẫn quản trị bộ câu hỏi ESG

Bộ câu hỏi trên website được lấy trực tiếp từ file Google Sheet **"Bộ câu hỏi ESG"**. Bạn chỉ cần sửa trong Sheet, không cần sửa code. Sau khoảng **5 phút**, website tự cập nhật.

## 1. Bạn làm việc ở đâu

| Tab                 | Dùng để                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02 Chung`          | Câu hỏi dùng cho **mọi** lĩnh vực                                                                                                                                            |
| `03` đến `10`       | Câu hỏi bổ sung theo từng lĩnh vực (Sản xuất, Thương mại & bán lẻ, Dịch vụ, Công nghệ thông tin, Xây dựng & bất động sản, Nông nghiệp & thực phẩm, Giáo dục & đào tạo, Khác) |
| `12 Logic cho Bình` | Khai báo loại trả lời của từng câu                                                                                                                                           |

Người dùng chọn lĩnh vực nào thì thấy tab 02 và tab lĩnh vực đó.

## 2. Thêm một câu hỏi mới

1. Mở tab nội dung (02 đến 10), thêm **một dòng mới ở cuối bảng** (hoặc chèn vào đúng chỗ muốn hiển thị).
2. Điền các cột:
   - **Mã câu:** mã duy nhất, theo thứ tự tiếp theo (ví dụ `C-061`, `MAN-013`). Không trùng mã đã có.
   - **Chủ đề:** viết đúng dạng `E · Tên chủ đề`, `S · …` hoặc `G · …`. Chữ cái đầu quyết định câu nằm ở phần Môi trường (E), Xã hội (S) hay Quản trị (G).
   - **Câu hỏi hiển thị**, **Hướng dẫn điền**, **Bằng chứng gợi ý**, **Gợi ý cải thiện ban đầu:** nội dung hiển thị cho người dùng.
   - **Mức khai báo:** `Cơ bản` (mọi doanh nghiệp thấy) hoặc `Mở rộng` (chỉ doanh nghiệp từ 50 người trở lên thấy).
   - **Duyệt nội dung:** chọn `Đã duyệt` thì câu mới hiện trên web.
3. Mở tab `12 Logic cho Bình`, **sao chép một dòng cũ** rồi sửa lại:
   - `question_id`: đúng mã câu vừa tạo.
   - `Tab nội dung`: đúng tab chứa câu mới.
   - `input_type`: loại trả lời (xem mục 4).
   - `unit`: đơn vị (chỉ cần với câu nhập số, ví dụ `kWh`).
   - `Bắt buộc trả lời`: `Có` hoặc `Không`.
   - Các cột còn lại giữ nguyên như dòng đã sao chép. Website chưa dùng đến chúng.
4. Đợi khoảng 5 phút rồi tải lại website để kiểm tra.

> Quên bước 3 thì câu vẫn hiện nhưng sẽ bị coi là câu Có/Không và bắt buộc trả lời.

> **Chèn dòng vào giữa bảng, không thêm dưới dòng cuối.** Các cột công thức trong Sheet tra cứu theo vùng cố định. Thêm dưới dòng cuối thì câu mới nằm ngoài vùng, các cột công thức và thống kê ở tab 00 sẽ thiếu. Bấm chuột phải vào một dòng ở giữa bảng, chọn **Chèn 1 dòng phía trên**, làm cả ở tab nội dung và tab 12. Website vẫn hiển thị đúng dù bạn thêm dòng ở đâu.

## 3. Sửa, ẩn hoặc xóa câu hỏi

- **Sửa nội dung:** sửa trực tiếp trong tab nội dung. Đừng đổi **Mã câu**.
- **Ẩn tạm thời:** đổi **Duyệt nội dung** sang bất kỳ giá trị nào khác `Đã duyệt` (ví dụ `Chờ duyệt`). Câu sẽ biến mất khỏi web nhưng vẫn còn trong Sheet.
- **Xóa hẳn:** nên ẩn thay vì xóa, để không làm mất câu trả lời người dùng đã nhập.

## 4. Loại trả lời (`input_type`)

| Giá trị                         | Người dùng thấy                                                |
| ------------------------------- | -------------------------------------------------------------- |
| `PRACTICE`                      | Có / Có một phần / Chưa có / Chưa rõ / Không áp dụng           |
| `NUMBER`                        | Đã có số liệu / Chưa có số liệu / Không áp dụng, kèm ô nhập số |
| `INTEGER`                       | Như `NUMBER`, nhưng chỉ nhận số nguyên                         |
| `TEXT`                          | Có nội dung / Chưa rõ / Không áp dụng, kèm ô nhập văn bản      |
| `INCIDENT`                      | Có / Không / Chưa xác minh, chọn Có thì phải mô tả             |
| `PRESENCE`                      | Có / Không / Chưa rõ                                           |
| `FUEL_TABLE`, `WORKFORCE_TABLE` | Như `NUMBER`, hiện là một ô văn bản để nhập bảng               |

Giá trị không có trong danh sách trên sẽ được xem là `TEXT`.

## 5. Những điều cần lưu ý

- **Không đổi tên tab** và **không đổi tên các cột tiêu đề** (`Mã câu`, `Chủ đề`, `Câu hỏi hiển thị`, `Duyệt nội dung`, `Hướng dẫn điền`, `Bằng chứng gợi ý`, `Mức khai báo`, `Gợi ý cải thiện ban đầu`; ở tab 12: `question_id`, `input_type`, `unit`, `Bắt buộc trả lời`).
- **Chỉ câu có `Duyệt nội dung` đúng là `Đã duyệt` mới hiện lên web.** Viết sai chính tả (ví dụ "Da duyet") thì câu bị ẩn.
- **Mã câu không trùng nhau.** Nếu trùng, web chỉ giữ dòng đầu tiên.
- **Không đổi Mã câu của câu đã có người trả lời**, vì câu trả lời lưu theo mã.
- **Chủ đề gõ đồng nhất.** `E · Nước` và `E · nước` (khác hoa thường) sẽ thành hai nhóm khác nhau.
- **Thứ tự hiển thị** theo thứ tự dòng trong Sheet. Nhóm hiện theo thứ tự chủ đề xuất hiện đầu tiên.
- **Khi sắp xếp hoặc lọc, chọn cả bảng.** Không sắp xếp riêng một cột, vì sẽ lệch câu hỏi với trạng thái duyệt.
- **Giữ chia sẻ file ở mức "Bất kỳ ai có đường liên kết đều xem được".** Nếu đổi sang riêng tư, website không đọc được bộ câu hỏi và sẽ báo lỗi.
- Website chỉ **đọc** Sheet này. Dữ liệu người dùng nhập không ghi vào đây.

## 6. Chưa hỗ trợ

- Thêm **lĩnh vực mới** chỉ bằng cách tạo tab trong Sheet. Hiện cần nhờ lập trình viên cấu hình.
