import type { Metadata } from "next";

import { Container } from "@/components/ui";
import { SurveyWorkspace } from "@/features/survey";

export const metadata: Metadata = {
  title: "Khảo sát ESG",
};

export default function HomePage() {
  return (
    <main>
      <Container className="py-10">
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Hồ sơ ESG, bắt đầu từ đây
          <span className="text-primary-500">.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Nền tảng tạo báo cáo ESG nội bộ miễn phí cho doanh nghiệp. Điền thông
          tin, thêm minh chứng và hoàn thành bộ câu hỏi theo thứ tự bạn muốn.
        </p>

        <div className="mt-10">
          <SurveyWorkspace />
        </div>
      </Container>
    </main>
  );
}
