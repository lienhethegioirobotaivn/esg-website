import type { Metadata } from "next";

import { Card, Container } from "@/components/ui";
import { SurveyWorkspace } from "@/features/survey";
import { getSurveyBank } from "@/server/survey-bank/get-survey-bank";

export const metadata: Metadata = {
  title: "Khảo sát ESG",
};

export const dynamic = "force-dynamic";

async function loadSurvey() {
  try {
    return { survey: await getSurveyBank(), error: null };
  } catch (error) {
    console.error(error);
    return { survey: null, error: "Không tải được bộ câu hỏi." };
  }
}

export default async function HomePage() {
  const { survey, error } = await loadSurvey();

  return (
    <main>
      <Container className="py-6">
        <div className="mt-4">
          {survey ? (
            <SurveyWorkspace
              survey={survey}
              intro={
                <>
                  <h1 className="text-2xl font-bold">
                    TẠO BÁO CÁO ESG MIỄN PHÍ
                  </h1>
                  <p className="mt-2 max-w-xl text-muted">
                    Nền tảng tạo báo cáo ESG nội bộ miễn phí cho doanh nghiệp
                    chuẩn EU. Điền thông tin, thêm minh chứng và tải về báo cáo
                    của bạn. Chứng nhận chuẩn ESG ngay hôm nay!
                  </p>
                </>
              }
            />
          ) : (
            <Card className="p-6">
              <h1 className="text-lg font-semibold">{error}</h1>
              <p className="mt-2 text-sm text-muted">
                Vui lòng tải lại trang sau ít phút. Nếu lỗi vẫn còn, hãy liên hệ
                quản trị viên để kiểm tra kết nối tới server của website.
              </p>
            </Card>
          )}
        </div>
      </Container>
    </main>
  );
}
