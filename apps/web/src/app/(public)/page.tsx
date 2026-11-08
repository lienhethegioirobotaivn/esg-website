import type { Metadata } from "next";

import { Card, Container } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { SurveyWorkspace } from "@/features/survey";
import { pageMetadata } from "@/lib/seo";
import {
  SITE_DESCRIPTION,
  SITE_LOGO,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
} from "@/lib/site";
import { getSurveyBank } from "@/server/survey-bank/get-survey-bank";

export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME} - ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl(SITE_LOGO),
    description: SITE_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "vi-VN",
  },
];

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
      <JsonLd data={homeJsonLd} />
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
