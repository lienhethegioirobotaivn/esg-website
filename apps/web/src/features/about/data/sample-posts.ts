import { richDocFromBlocks } from "@esg/shared";

import type { Post, PostBlock, PostSection } from "../types";

const AUTHOR = "Ban biên tập ESG Report Online";

interface SampleInput {
  slug: string;
  section: PostSection;
  category: string;
  title: string;
  summary: string;
  day: number;
  readMinutes?: number;
  likes?: number;
  featured?: boolean;
  popular?: boolean;
  spotlight?: boolean;
  body?: PostBlock[];
}

function defaultBody(summary: string): PostBlock[] {
  return [
    { type: "paragraph", text: summary },
    { type: "heading", text: "Những điểm cần lưu ý" },
    {
      type: "paragraph",
      text: "Nội dung chi tiết của bài viết sẽ được ban biên tập cập nhật. Đây là nội dung minh họa để kiểm tra giao diện trang bài viết.",
    },
  ];
}

function sample(input: SampleInput): Post {
  const date = new Date(Date.UTC(2026, 9, 31 - input.day));
  return {
    id: input.slug,
    slug: input.slug,
    section: input.section,
    category: input.category,
    title: input.title,
    summary: input.summary,
    coverUrl: null,
    author: AUTHOR,
    readMinutes: input.readMinutes ?? 4,
    publishedAt: date.toISOString(),
    likes: input.likes ?? 0,
    featured: input.featured ?? false,
    popular: input.popular ?? false,
    spotlight: input.spotlight ?? false,
    status: "published",
    isSample: true,
    body: richDocFromBlocks(input.body ?? defaultBody(input.summary)),
  };
}

const START_ESG_BODY: PostBlock[] = [
  {
    type: "paragraph",
    text: "Nhiều doanh nghiệp quan tâm đến ESG nhưng còn băn khoăn nên bắt đầu từ đâu. Trên thực tế, việc xây dựng hồ sơ ESG có thể triển khai theo một lộ trình rõ ràng, tận dụng dữ liệu sẵn có và bám sát thực tiễn hoạt động của doanh nghiệp. Dưới đây là ba bước cơ bản để khởi động hiệu quả.",
  },
  { type: "heading", text: "1. Xác định phạm vi và người phụ trách" },
  {
    type: "paragraph",
    text: "Trước hết, doanh nghiệp cần xác định phạm vi báo cáo, bao gồm kỳ báo cáo (ví dụ: theo năm tài chính) và các cơ sở, đơn vị thuộc phạm vi thu thập thông tin (như nhà máy, văn phòng, chi nhánh). Đồng thời, nên chỉ định một đầu mối phụ trách (hoặc một nhóm nhỏ) để điều phối, thu thập và tổng hợp thông tin từ các bộ phận liên quan trong doanh nghiệp.",
  },
  { type: "heading", text: "2. Thu thập dữ liệu và minh chứng" },
  {
    type: "paragraph",
    text: "Tiếp theo, doanh nghiệp tiến hành thu thập các dữ liệu và minh chứng hiện có. Ví dụ: số liệu tiêu thụ điện, nước; số lượng lao động; các thực hành về an toàn, sức khỏe và môi trường làm việc; cùng với các văn bản, chính sách nội bộ như chính sách môi trường, chính sách nhân sự, quy định an toàn lao động. Trong quá trình này, cần phân biệt rõ dữ liệu chưa có (có thể bổ sung, hoàn thiện) và nội dung không áp dụng (không liên quan đến đặc thù hoạt động của doanh nghiệp) để tránh nhầm lẫn.",
  },
  { type: "heading", text: "3. Xây dựng kế hoạch cải thiện" },
  {
    type: "paragraph",
    text: "Cuối cùng, từ kết quả rà soát ban đầu, doanh nghiệp xác định các hành động cải thiện phù hợp, khả thi với nguồn lực và bối cảnh thực tế. Mỗi hành động nên có người chịu trách nhiệm cụ thể (ví dụ: phòng vận hành, phòng nhân sự) và thời điểm dự kiến rà soát, đánh giá kết quả, được doanh nghiệp xác nhận để bảo đảm tính khả thi và liên tục.",
  },
  {
    type: "callout",
    title: "Bắt đầu từ những thông tin doanh nghiệp đã có",
    text: "Xây dựng hồ sơ ESG không nhất thiết phải phức tạp hay triển khai ngay trên diện rộng. Doanh nghiệp có thể bắt đầu từ dữ liệu sẵn có, xác định phạm vi phù hợp và từng bước hoàn thiện theo lộ trình thực tế, hướng tới quản trị bền vững và hiệu quả lâu dài.",
  },
];

export const SAMPLE_NEWS: Post[] = [
  sample({
    slug: "doanh-nghiep-bat-dau-xay-dung-ho-so-esg-tu-dau",
    section: "tin-tuc",
    category: "Kiến thức ESG",
    title: "Doanh nghiệp bắt đầu xây dựng hồ sơ ESG từ đâu?",
    summary:
      "Bắt đầu từ dữ liệu sẵn có, xác định phạm vi và lưu minh chứng rõ ràng để từng bước xây dựng hồ sơ ESG phù hợp với doanh nghiệp.",
    day: 1,
    readMinutes: 5,
    featured: true,
    body: START_ESG_BODY,
  }),
  sample({
    slug: "minh-chung-esg-thu-thap-the-nao-de-kiem-tra",
    section: "tin-tuc",
    category: "Quản trị",
    title: "Minh chứng ESG: Thu thập thế nào để dễ kiểm tra?",
    summary:
      "Các loại minh chứng phổ biến, cách lưu trữ và những lưu ý giúp doanh nghiệp sẵn sàng khi rà soát.",
    day: 2,
    featured: true,
    likes: 3,
  }),
  sample({
    slug: "tu-du-lieu-den-ke-hoach-cai-thien-esg",
    section: "tin-tuc",
    category: "Môi trường",
    title: "Từ dữ liệu đến kế hoạch cải thiện ESG",
    summary:
      "Cách chuyển dữ liệu vận hành thành mục tiêu, hành động và kế hoạch cải thiện theo lộ trình thực tế.",
    day: 3,
    featured: true,
    likes: 2,
  }),
  sample({
    slug: "theo-doi-dien-nang-tu-hoa-don-hang-thang",
    section: "tin-tuc",
    category: "Môi trường",
    title: "Theo dõi điện năng từ hóa đơn hằng tháng",
    summary:
      "Cách sử dụng hóa đơn để theo dõi xu hướng tiêu thụ và xác định cơ hội tiết kiệm.",
    day: 4,
  }),
  sample({
    slug: "quan-ly-nuoc-trong-hoat-dong-doanh-nghiep",
    section: "tin-tuc",
    category: "Môi trường",
    title: "Quản lý nước trong hoạt động doanh nghiệp",
    summary:
      "Các bước kiểm soát, theo dõi và sử dụng nước hiệu quả, phù hợp với thực hành ESG.",
    day: 5,
  }),
  sample({
    slug: "phan-loai-chat-thai-tai-noi-lam-viec",
    section: "tin-tuc",
    category: "Môi trường",
    title: "Phân loại chất thải tại nơi làm việc",
    summary:
      "Hướng dẫn triển khai phân loại, thu gom và xử lý chất thải đúng quy định, dễ áp dụng.",
    day: 6,
  }),
  sample({
    slug: "an-toan-lao-dong-va-ho-so-dao-tao",
    section: "tin-tuc",
    category: "Xã hội",
    title: "An toàn lao động và hồ sơ đào tạo",
    summary:
      "Những nội dung cần có trong đào tạo an toàn lao động và cách lưu trữ hồ sơ theo yêu cầu ESG.",
    day: 7,
  }),
  sample({
    slug: "xay-dung-moi-truong-lam-viec-hoa-nhap",
    section: "tin-tuc",
    category: "Xã hội",
    title: "Xây dựng môi trường làm việc hòa nhập",
    summary:
      "Các thực hành giúp tạo môi trường công bằng, tôn trọng sự đa dạng và gắn kết nhân viên.",
    day: 8,
  }),
  sample({
    slug: "vai-tro-cua-lanh-dao-trong-thuc-hanh-esg",
    section: "tin-tuc",
    category: "Quản trị",
    title: "Vai trò của lãnh đạo trong thực hành ESG",
    summary:
      "Lãnh đạo định hướng, phân bổ nguồn lực và thúc đẩy ESG trở thành một phần của vận hành.",
    day: 9,
  }),
  sample({
    slug: "minh-bach-thong-tin-voi-cac-ben-lien-quan",
    section: "tin-tuc",
    category: "Quản trị",
    title: "Minh bạch thông tin với các bên liên quan",
    summary:
      "Cách công bố thông tin ESG rõ ràng, nhất quán và phù hợp với kỳ vọng của các bên liên quan.",
    day: 10,
  }),
  sample({
    slug: "chuoi-cung-ung-va-trach-nhiem-cua-nha-cung-cap",
    section: "tin-tuc",
    category: "Thị trường & chính sách",
    title: "Chuỗi cung ứng và trách nhiệm của nhà cung cấp",
    summary:
      "Cách đưa tiêu chí ESG vào đánh giá nhà cung cấp và thúc đẩy thực hành bền vững trong chuỗi cung ứng.",
    day: 11,
  }),
  sample({
    slug: "phan-biet-bao-cao-esg-va-kiem-ke-khi-nha-kinh",
    section: "tin-tuc",
    category: "Kiến thức ESG",
    title: "Phân biệt báo cáo ESG và kiểm kê khí nhà kính",
    summary:
      "Hai loại tài liệu có mục đích và phạm vi khác nhau; hiểu đúng giúp doanh nghiệp chuẩn bị đúng.",
    day: 12,
    popular: true,
  }),
  sample({
    slug: "esg-khac-gi-voi-csr",
    section: "tin-tuc",
    category: "Kiến thức ESG",
    title: "ESG khác gì với CSR?",
    summary:
      "So sánh hai khái niệm thường bị nhầm lẫn và vai trò của từng khái niệm với doanh nghiệp.",
    day: 13,
    popular: true,
  }),
  sample({
    slug: "nhung-du-lieu-doanh-nghiep-nen-chuan-bi",
    section: "tin-tuc",
    category: "Kiến thức ESG",
    title: "Những dữ liệu doanh nghiệp nên chuẩn bị",
    summary:
      "Danh mục dữ liệu cơ bản về môi trường, xã hội và quản trị giúp việc lập hồ sơ nhanh hơn.",
    day: 14,
    popular: true,
  }),
  sample({
    slug: "ai-phu-trach-ho-so-esg-trong-doanh-nghiep",
    section: "tin-tuc",
    category: "Quản trị",
    title: "Ai phụ trách hồ sơ ESG trong doanh nghiệp?",
    summary:
      "Gợi ý cách phân công đầu mối và phối hợp giữa các bộ phận khi xây dựng hồ sơ ESG.",
    day: 15,
    popular: true,
  }),
  sample({
    slug: "hieu-dung-ve-tin-chi-carbon",
    section: "tin-tuc",
    category: "Thị trường & chính sách",
    title: "Hiểu đúng về tín chỉ carbon",
    summary:
      "Tín chỉ carbon là gì, khi nào doanh nghiệp cần quan tâm và những điểm cần thận trọng.",
    day: 16,
    popular: true,
  }),
  sample({
    slug: "lo-trinh-xay-dung-bao-cao-esg-cho-doanh-nghiep-vua-va-nho",
    section: "tin-tuc",
    category: "Kiến thức ESG",
    title: "Lộ trình xây dựng báo cáo ESG cho doanh nghiệp vừa và nhỏ",
    summary:
      "Các giai đoạn triển khai từ chuẩn bị dữ liệu đến hoàn thiện báo cáo, phù hợp với nguồn lực hạn chế.",
    day: 17,
    spotlight: true,
  }),
  sample({
    slug: "cap-nhat-chinh-sach-quy-dinh-esg-moi-nhat",
    section: "tin-tuc",
    category: "Thị trường & chính sách",
    title: "Cập nhật chính sách, quy định ESG mới nhất",
    summary:
      "Tổng hợp các thay đổi về chính sách và quy định mà doanh nghiệp cần theo dõi.",
    day: 18,
    spotlight: true,
  }),
  sample({
    slug: "do-luong-va-giam-phat-thai-trong-van-hanh",
    section: "tin-tuc",
    category: "Môi trường",
    title: "Đo lường và giảm phát thải trong vận hành",
    summary:
      "Cách xác định nguồn phát thải chính và đặt mục tiêu giảm phù hợp với quy mô doanh nghiệp.",
    day: 19,
    spotlight: true,
  }),
];

export const SAMPLE_ACHIEVEMENTS: Post[] = [
  sample({
    slug: "dong-hanh-cung-doanh-nghiep-tren-hanh-trinh-esg",
    section: "thanh-tuu",
    category: "Sự kiện",
    title: "Đồng hành cùng doanh nghiệp trên hành trình ESG",
    summary:
      "Chuỗi hoạt động nhằm chia sẻ định hướng, kinh nghiệm và giải pháp thực tế, hỗ trợ doanh nghiệp tiếp cận và triển khai ESG một cách hiệu quả, phù hợp với đặc thù hoạt động.",
    day: 1,
    featured: true,
  }),
  sample({
    slug: "tung-buoc-hoan-thien-nen-tang-esg-report-online",
    section: "thanh-tuu",
    category: "Dấu mốc",
    title: "Từng bước hoàn thiện nền tảng ESG Report Online",
    summary:
      "Cập nhật các cải tiến về tính năng, trải nghiệm và hiệu quả sử dụng, đáp ứng tốt hơn nhu cầu của doanh nghiệp.",
    day: 2,
    featured: true,
  }),
  sample({
    slug: "khong-gian-cap-nhat-giai-thuong-va-ghi-nhan",
    section: "thanh-tuu",
    category: "Giải thưởng & ghi nhận",
    title: "Không gian cập nhật giải thưởng & ghi nhận",
    summary:
      "Giới thiệu các hoạt động, dấu mốc và ghi nhận tích cực trong quá trình phát triển của nền tảng.",
    day: 3,
    featured: true,
  }),
  sample({
    slug: "ket-noi-chuyen-gia-va-cong-dong-doanh-nghiep",
    section: "thanh-tuu",
    category: "Sự kiện",
    title: "Kết nối chuyên gia và cộng đồng doanh nghiệp",
    summary:
      "Tạo không gian trao đổi chuyên môn, chia sẻ xu hướng và thực tiễn triển khai ESG giữa các chuyên gia và doanh nghiệp.",
    day: 4,
  }),
  sample({
    slug: "chia-se-kinh-nghiem-chuan-bi-du-lieu-esg",
    section: "thanh-tuu",
    category: "Dấu mốc",
    title: "Chia sẻ kinh nghiệm chuẩn bị dữ liệu ESG",
    summary:
      "Chia sẻ kinh nghiệm thực tế trong việc thu thập, kiểm tra và chuẩn hóa dữ liệu ESG, giúp doanh nghiệp tiết kiệm thời gian và nâng cao độ tin cậy.",
    day: 5,
  }),
  sample({
    slug: "cap-nhat-tinh-nang-ho-tro-lap-bao-cao",
    section: "thanh-tuu",
    category: "Sự kiện",
    title: "Cập nhật tính năng hỗ trợ lập báo cáo",
    summary:
      "Giới thiệu các tính năng mới được phát triển nhằm đơn giản hóa quy trình, tăng tính chính xác và khả năng tùy chỉnh của báo cáo ESG.",
    day: 6,
  }),
  sample({
    slug: "ghi-nhan-phan-hoi-tu-doanh-nghiep",
    section: "thanh-tuu",
    category: "Dấu mốc",
    title: "Ghi nhận phản hồi từ doanh nghiệp",
    summary:
      "Tổng hợp những ý kiến, đề xuất và trải nghiệm thực tế từ doanh nghiệp trong quá trình sử dụng nền tảng.",
    day: 7,
  }),
  sample({
    slug: "hoat-dong-dao-tao-va-huong-dan-su-dung",
    section: "thanh-tuu",
    category: "Sự kiện",
    title: "Hoạt động đào tạo và hướng dẫn sử dụng",
    summary:
      "Tổ chức các buổi đào tạo, hướng dẫn thực hành giúp doanh nghiệp nắm vững quy trình và khai thác hiệu quả các tính năng của nền tảng.",
    day: 8,
  }),
  sample({
    slug: "nhung-dau-moc-tren-hanh-trinh-phat-trien",
    section: "thanh-tuu",
    category: "Dấu mốc",
    title: "Những dấu mốc trên hành trình phát triển",
    summary:
      "Tổng hợp các cột mốc quan trọng trong quá trình hoàn thiện nền tảng và mở rộng hỗ trợ doanh nghiệp triển khai ESG.",
    day: 9,
  }),
];
