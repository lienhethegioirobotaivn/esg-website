export interface HowItWorksStep {
  readonly title: string;
  readonly description: string;
}

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    title: "Nhập thông tin doanh nghiệp",
    description:
      "Điền tên, lĩnh vực, quy mô nhân sự, địa chỉ, kỳ báo cáo và năm báo cáo ở cột bên trái.",
  },
  {
    title: "Trả lời các câu hỏi",
    description:
      "Bộ câu hỏi chia thành ba phần Môi trường, Xã hội, Quản trị, mỗi phần có nhiều nhóm. Mỗi câu chọn Đã thực hiện, Đang thực hiện hoặc Chưa thực hiện. Với Đã thực hiện, hãy mô tả việc đã làm và đính kèm bằng chứng (PDF hoặc ảnh, tối đa 10 tệp).",
  },
  {
    title: "Lưu bản nháp",
    description:
      "Hệ thống tự lưu khi bạn trả lời xong một nhóm, hoặc bạn có thể bấm Lưu bản nháp bất cứ lúc nào. Lần sau mở lại trên cùng trình duyệt, bạn làm tiếp từ chỗ đã dừng. Tệp bằng chứng chưa được lưu trong bản nháp nên cần tải lại.",
  },
  {
    title: "Xem trước và tạo báo cáo",
    description:
      "Bấm Xem bản nháp để xem file PDF sẽ được xuất. Khi đã điền đủ, bấm Tạo báo cáo để tải về. Nếu còn thiếu, hệ thống liệt kê từng mục và đưa bạn tới đúng chỗ cần điền.",
  },
  {
    title: "Làm báo cáo mới",
    description:
      "Sau khi xuất báo cáo, bấm Làm báo cáo mới ở khung Tiến độ để xóa toàn bộ nội dung và bắt đầu lại từ đầu.",
  },
];
