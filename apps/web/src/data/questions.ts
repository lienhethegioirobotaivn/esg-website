import type { Guidance, Question, RequirementLevel } from "@esg/shared";

import { GROUP_IDS } from "./ids";

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
  id: string,
  groupId: string,
  order: number,
  text: string,
  guidance: Guidance = defaultGuidance,
  evidenceRequirement: RequirementLevel = "optional",
): Question {
  return {
    id,
    groupId,
    order,
    text,
    descriptionRequirement: "required",
    evidenceRequirement,
    guidance,
  };
}

export const questions: Question[] = [
  createQuestion(
    "4c7e1a90-2b5d-4f38-9e6a-8d3c1b7f5a01",
    GROUP_IDS.environmentStrategy,
    1,
    "Doanh nghiệp đã có chính sách bảo vệ môi trường?",
    environmentPolicyGuidance,
    "required",
  ),
  createQuestion(
    "8f2d6b13-7c9a-4e50-a1d4-3b6e9c2f8a02",
    GROUP_IDS.environmentStrategy,
    2,
    "Đã phân công người phụ trách các vấn đề môi trường?",
  ),
  createQuestion(
    "1a9c5e77-d3b8-4624-8f0b-6e2a4d7c1b03",
    GROUP_IDS.environmentStrategy,
    3,
    "Đã xác định các tác động môi trường chính của doanh nghiệp?",
  ),
  createQuestion(
    "e3b7f2a4-5c18-4d96-b9a3-0c8e1f5d6a04",
    GROUP_IDS.environmentStrategy,
    4,
    "Có mục tiêu cải thiện môi trường cho kỳ báo cáo?",
  ),
  createQuestion(
    "7d0a4c68-b1e9-4f35-8a2c-9f5b3e7d1c05",
    GROUP_IDS.environmentStrategy,
    5,
    "Có ngân sách dành cho hoạt động môi trường?",
  ),
  createQuestion(
    "2c8e6f91-a4d7-4b03-9d5e-1a7c3b9f0e06",
    GROUP_IDS.environmentStrategy,
    6,
    "Có rà soát các yêu cầu môi trường liên quan đến hoạt động?",
  ),
  createQuestion(
    "b5f19d3a-6e82-4c47-a0b6-7d2e8c4a1f07",
    GROUP_IDS.environmentStrategy,
    7,
    "Có lưu các hồ sơ môi trường áp dụng cho cơ sở hoạt động?",
  ),
  createQuestion(
    "90a3e7c5-1f4b-4d68-8b9e-5c2a6d0f3b08",
    GROUP_IDS.environmentStrategy,
    8,
    "Có theo dõi sự cố hoặc phản ánh về môi trường?",
  ),
  createQuestion(
    "f1d8b402-9a6c-4e73-b5c1-2e7f0a3d8c09",
    GROUP_IDS.environmentStrategy,
    9,
    "Có hướng dẫn ứng phó sự cố môi trường?",
  ),
  createQuestion(
    "3e5c9a76-d0b2-4f14-9c8a-6b1e4d7f2a10",
    GROUP_IDS.environmentStrategy,
    10,
    "Có rà soát kết quả thực hiện mục tiêu môi trường?",
  ),
  createQuestion(
    "a8c2f5e1-4b97-4d30-8e6d-0f3a9c5b7e11",
    GROUP_IDS.energyClimate,
    1,
    "Có theo dõi lượng điện tiêu thụ hằng tháng?",
  ),
  createQuestion(
    "5b0d7e92-c3a8-4f61-a9d4-8e1c6b2f4a12",
    GROUP_IDS.energyClimate,
    2,
    "Có biện pháp tiết kiệm năng lượng đang áp dụng?",
  ),
  createQuestion(
    "d2f6a8c4-7e15-4b09-b3a7-9c5d1e8f0b13",
    GROUP_IDS.energyClimate,
    3,
    "Có ước tính lượng phát thải khí nhà kính của doanh nghiệp?",
  ),
  createQuestion(
    "67e1b3d9-0a4c-4f82-8d5b-3a7c9e2f6d14",
    GROUP_IDS.laborWelfare,
    1,
    "Có hợp đồng lao động bằng văn bản với toàn bộ người lao động?",
  ),
  createQuestion(
    "c4a7e0f2-8b3d-4619-9e5a-1d6c2b8f7a15",
    GROUP_IDS.laborWelfare,
    2,
    "Có đóng bảo hiểm bắt buộc đầy đủ theo quy định?",
  ),
  createQuestion(
    "0f9b3d65-a2e7-4c48-b1d0-5e8a7c3f9b16",
    GROUP_IDS.laborWelfare,
    3,
    "Có nội quy lao động được phổ biến đến người lao động?",
  ),
  createQuestion(
    "8a5e2c17-f4b9-4d03-a6c8-2b0d7e1f5c17",
    GROUP_IDS.governanceResponsibility,
    1,
    "Có sơ đồ tổ chức và phân công trách nhiệm rõ ràng?",
  ),
  createQuestion(
    "3d7c1f98-6a0e-4b25-8f3a-9c4b5e2d1a18",
    GROUP_IDS.governanceResponsibility,
    2,
    "Có họp rà soát định kỳ về kết quả hoạt động?",
  ),
  createQuestion(
    "e9b4a6d0-1c75-4f82-9d2e-7a3f0c8b6e19",
    GROUP_IDS.governanceResponsibility,
    3,
    "Có quy chế nội bộ được ban hành bằng văn bản?",
  ),
];
