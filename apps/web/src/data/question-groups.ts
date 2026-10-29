import type { QuestionGroup } from "@esg/shared";

import { GROUP_IDS, PILLAR_IDS } from "./ids";

export const questionGroups: QuestionGroup[] = [
  {
    id: GROUP_IDS.environmentStrategy,
    pillarId: PILLAR_IDS.environment,
    order: 1,
    title: "Chiến lược môi trường",
    description:
      "Đặt nền móng cho cách doanh nghiệp quản lý tác động đến môi trường.",
  },
  {
    id: GROUP_IDS.energyClimate,
    pillarId: PILLAR_IDS.environment,
    order: 2,
    title: "Năng lượng & khí hậu",
    description: "Theo dõi mức tiêu thụ năng lượng và phát thải khí nhà kính.",
  },
  {
    id: GROUP_IDS.waterResources,
    pillarId: PILLAR_IDS.environment,
    order: 3,
    title: "Nước & tài nguyên",
    description:
      "Quản lý việc sử dụng nước và nguyên vật liệu trong hoạt động.",
  },
  {
    id: GROUP_IDS.wasteCircular,
    pillarId: PILLAR_IDS.environment,
    order: 4,
    title: "Chất thải & tuần hoàn",
    description: "Kiểm soát chất thải và thúc đẩy tái sử dụng, tái chế.",
  },
  {
    id: GROUP_IDS.laborWelfare,
    pillarId: PILLAR_IDS.social,
    order: 5,
    title: "Lao động & phúc lợi",
    description: "Đảm bảo quyền lợi và điều kiện làm việc cho người lao động.",
  },
  {
    id: GROUP_IDS.safetyDevelopment,
    pillarId: PILLAR_IDS.social,
    order: 6,
    title: "An toàn & phát triển",
    description: "An toàn lao động, đào tạo và phát triển nghề nghiệp.",
  },
  {
    id: GROUP_IDS.customersCommunity,
    pillarId: PILLAR_IDS.social,
    order: 7,
    title: "Khách hàng & cộng đồng",
    description:
      "Trách nhiệm với khách hàng và cộng đồng nơi doanh nghiệp hoạt động.",
  },
  {
    id: GROUP_IDS.governanceResponsibility,
    pillarId: PILLAR_IDS.governance,
    order: 8,
    title: "Quản trị & trách nhiệm",
    description: "Cơ cấu quản trị và phân định trách nhiệm trong doanh nghiệp.",
  },
  {
    id: GROUP_IDS.ethicsTransparency,
    pillarId: PILLAR_IDS.governance,
    order: 9,
    title: "Đạo đức & minh bạch",
    description: "Chuẩn mực đạo đức kinh doanh và công khai thông tin.",
  },
  {
    id: GROUP_IDS.supplyChainData,
    pillarId: PILLAR_IDS.governance,
    order: 10,
    title: "Chuỗi cung ứng & dữ liệu",
    description: "Quản lý nhà cung cấp và bảo vệ dữ liệu.",
  },
];
