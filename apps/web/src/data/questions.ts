import type { Guidance, Question, RequirementLevel } from "@esg/shared";

const defaultGuidance: Guidance = {
  title: "Trả lời đúng thực tế.",
  body: "Chọn đáp án phản ánh đúng tình hình hiện tại của doanh nghiệp. Nếu chọn “Có”, hãy mô tả ngắn gọn cách doanh nghiệp đang thực hiện.",
  suggestedEvidence:
    "Văn bản, quy trình, biên bản, hình ảnh hoặc báo cáo nội bộ liên quan.",
  tip: "Chưa có? Cứ ghi nhận thực tế. Đây là điểm bắt đầu để cải thiện.",
};

const environmentPolicyGuidance: Guidance = {
  title: "Điền đúng từ bước đầu.",
  body: "Chính sách có thể là một văn bản riêng hoặc một phần của quy chế nội bộ. Hãy ghi rõ thời điểm ban hành, người phê duyệt và phạm vi áp dụng.",
  suggestedEvidence:
    "Chính sách môi trường, quyết định ban hành, sổ tay nội bộ hoặc ảnh văn bản đã ký.",
  tip: "Chưa có? Cứ ghi nhận thực tế. Đây là điểm bắt đầu để cải thiện.",
};

function createQuestion(
  code: string,
  groupId: string,
  order: number,
  text: string,
  guidance: Guidance = defaultGuidance,
  evidenceRequirement: RequirementLevel = "optional",
): Question {
  return {
    id: `q-${code.toLowerCase()}`,
    groupId,
    order,
    code,
    text,
    descriptionRequirement: "required",
    evidenceRequirement,
    guidance,
  };
}

export const questions: Question[] = [
  createQuestion(
    "E001",
    "g-01",
    1,
    "Doanh nghiệp đã có chính sách bảo vệ môi trường?",
    environmentPolicyGuidance,
    "required",
  ),
  createQuestion(
    "E002",
    "g-01",
    2,
    "Đã phân công người phụ trách các vấn đề môi trường?",
  ),
  createQuestion(
    "E003",
    "g-01",
    3,
    "Đã xác định các tác động môi trường chính của doanh nghiệp?",
  ),
  createQuestion(
    "E004",
    "g-01",
    4,
    "Có mục tiêu cải thiện môi trường cho kỳ báo cáo?",
  ),
  createQuestion(
    "E005",
    "g-01",
    5,
    "Có ngân sách dành cho hoạt động môi trường?",
  ),
  createQuestion(
    "E006",
    "g-01",
    6,
    "Có rà soát các yêu cầu môi trường liên quan đến hoạt động?",
  ),
  createQuestion(
    "E007",
    "g-01",
    7,
    "Có lưu các hồ sơ môi trường áp dụng cho cơ sở hoạt động?",
  ),
  createQuestion(
    "E008",
    "g-01",
    8,
    "Có theo dõi sự cố hoặc phản ánh về môi trường?",
  ),
  createQuestion("E009", "g-01", 9, "Có hướng dẫn ứng phó sự cố môi trường?"),
  createQuestion(
    "E010",
    "g-01",
    10,
    "Có rà soát kết quả thực hiện mục tiêu môi trường?",
  ),
  createQuestion(
    "E011",
    "g-02",
    1,
    "Có theo dõi lượng điện tiêu thụ hằng tháng?",
  ),
  createQuestion(
    "E012",
    "g-02",
    2,
    "Có biện pháp tiết kiệm năng lượng đang áp dụng?",
  ),
  createQuestion(
    "E013",
    "g-02",
    3,
    "Có ước tính lượng phát thải khí nhà kính của doanh nghiệp?",
  ),
  createQuestion(
    "S001",
    "g-05",
    1,
    "Có hợp đồng lao động bằng văn bản với toàn bộ người lao động?",
  ),
  createQuestion(
    "S002",
    "g-05",
    2,
    "Có đóng bảo hiểm bắt buộc đầy đủ theo quy định?",
  ),
  createQuestion(
    "S003",
    "g-05",
    3,
    "Có nội quy lao động được phổ biến đến người lao động?",
  ),
  createQuestion(
    "G001",
    "g-08",
    1,
    "Có sơ đồ tổ chức và phân công trách nhiệm rõ ràng?",
  ),
  createQuestion(
    "G002",
    "g-08",
    2,
    "Có họp rà soát định kỳ về kết quả hoạt động?",
  ),
  createQuestion(
    "G003",
    "g-08",
    3,
    "Có quy chế nội bộ được ban hành bằng văn bản?",
  ),
];
