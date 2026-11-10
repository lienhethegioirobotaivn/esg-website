import type { Metadata } from "next";

import { Card, Container } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { HTML_LANG } from "@/features/locale/constants";
import { localizePath } from "@/features/locale/lib/path";
import { getLocale, getT } from "@/features/locale/server";
import { SurveyWorkspace } from "@/features/survey";
import { msg } from "@/features/locale";
import { pageMetadata } from "@/lib/seo";
import {
  SITE_DESCRIPTION,
  SITE_LOGO,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
} from "@/lib/site";
import { translateSurvey } from "@/server/translation/translate-survey";
import { getSurveyBank } from "@/server/survey-bank/get-survey-bank";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: `${SITE_NAME} - ${t(SITE_TAGLINE)}`,
    description: t(SITE_DESCRIPTION),
    path: "/",
    locale: await getLocale(),
    absoluteTitle: true,
  });
}

export const dynamic = "force-dynamic";

async function loadSurvey() {
  try {
    const locale = await getLocale();
    const survey = await translateSurvey(await getSurveyBank(), locale);
    return { survey, error: null };
  } catch (error) {
    console.error(error);
    return { survey: null, error: msg("Không tải được bộ câu hỏi.") };
  }
}

export default async function HomePage() {
  const t = await getT();
  const locale = await getLocale();
  const homeJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl(localizePath("/", locale)),
      logo: absoluteUrl(SITE_LOGO),
      description: t(SITE_DESCRIPTION),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl(localizePath("/", locale)),
      inLanguage: HTML_LANG[locale],
    },
  ];
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
                    {t("TẠO BÁO CÁO ESG MIỄN PHÍ")}
                  </h1>
                  <p className="mt-2 max-w-xl text-muted">
                    {t(
                      "Nền tảng tạo báo cáo ESG nội bộ miễn phí cho doanh nghiệp chuẩn EU. Điền thông tin, thêm minh chứng và tải về báo cáo của bạn. Chứng nhận chuẩn ESG ngay hôm nay!",
                    )}
                  </p>
                </>
              }
            />
          ) : (
            <Card className="p-6">
              <h1 className="text-lg font-semibold">{error === null ? null : t(error)}</h1>
              <p className="mt-2 text-sm text-muted">
                {t(
                  "Vui lòng tải lại trang sau ít phút. Nếu lỗi vẫn còn, hãy liên hệ quản trị viên để kiểm tra kết nối tới server của website.",
                )}
              </p>
            </Card>
          )}
        </div>
      </Container>
    </main>
  );
}
