import type { Metadata } from "next";

import { Container } from "@/components/ui";
import { SurveyWorkspace } from "@/features/survey";

export const metadata: Metadata = {
  title: "Khảo sát ESG",
};

export default function HomePage() {
  return (
    <main>
      <Container className="py-6">
        <div className="mt-4">
          <SurveyWorkspace
            intro={
              <>
                <h1 className="text-2xl font-bold">TẠO BÁO CÁO ESG MIỄN PHÍ</h1>
                <p className="mt-2 max-w-3xl text-muted">
                  Nền tảng tạo báo cáo ESG nội bộ miễn phí cho doanh nghiệp
                  chuẩn EU. Điền thông tin, thêm minh chứng và tải về báo cáo
                  của bạn. Chứng nhận chuẩn ESG ngay hôm nay!
                </p>
              </>
            }
          />
        </div>
      </Container>
    </main>
  );
}
