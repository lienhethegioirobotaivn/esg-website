import type { QuestionGroup } from "@esg/shared";

import { GROUP_IDS, PILLAR_IDS } from "./ids";

export const questionGroups: QuestionGroup[] = [
  {
    id: GROUP_IDS.waterResources,
    pillarId: PILLAR_IDS.environment,
    order: 1,
    title: "Nước và tài nguyên",
    description: "Kiểm soát nguồn nước, nước thải, năng lượng và rủi ro tài nguyên tại các nhà máy.",
  },
  {
    id: GROUP_IDS.wasteCircular,
    pillarId: PILLAR_IDS.environment,
    order: 2,
    title: "Chất thải và tuần hoàn",
    description: "Phân loại, xử lý chất thải đúng luật; giảm nhựa, tăng tái chế và thu hồi bao bì (EPR).",
  },
  {
    id: GROUP_IDS.laborWelfare,
    pillarId: PILLAR_IDS.social,
    order: 3,
    title: "Lao động và phúc lợi",
    description: "Quyền lợi hợp pháp, thu nhập, đối thoại và phúc lợi của người lao động, kể cả lao động gián tiếp.",
  },
  {
    id: GROUP_IDS.safetyDevelopment,
    pillarId: PILLAR_IDS.social,
    order: 4,
    title: "An toàn và phát triển",
    description: "An toàn hóa chất, thiết bị, ứng phó sự cố; đào tạo và phát triển năng lực người lao động.",
  },
  {
    id: GROUP_IDS.customersCommunity,
    pillarId: PILLAR_IDS.social,
    order: 5,
    title: "Khách hàng và cộng đồng",
    description: "An toàn, chất lượng sản phẩm, quảng cáo trung thực, dữ liệu khách hàng và quan hệ với cộng đồng.",
  },
  {
    id: GROUP_IDS.governanceResponsibility,
    pillarId: PILLAR_IDS.governance,
    order: 6,
    title: "Quản trị và trách nhiệm",
    description: "Cam kết của HĐQT, bộ máy ESG, quản trị rủi ro, tuân thủ và trách nhiệm giải trình.",
  },
  {
    id: GROUP_IDS.ethicsTransparency,
    pillarId: PILLAR_IDS.governance,
    order: 7,
    title: "Đạo đức và minh bạch",
    description: "Chống tham nhũng, xung đột lợi ích, quà tặng, tố giác và công bố thông tin trung thực.",
  },
  {
    id: GROUP_IDS.supplyChainData,
    pillarId: PILLAR_IDS.governance,
    order: 8,
    title: "Chuỗi cung ứng và dữ liệu",
    description: "Đánh giá ESG nhà cung cấp hóa chất, bao bì, vận tải và chất lượng dữ liệu ESG.",
  },
];
