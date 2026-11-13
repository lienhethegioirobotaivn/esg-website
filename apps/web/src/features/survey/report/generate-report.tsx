import { pdf } from "@react-pdf/renderer";
import type { ReportModel, ReportTheme } from "@esg/shared";

import type { Locale } from "@/features/locale/constants";
import type { TFunction } from "@/features/locale/lib/translate";

import { mapStrings, softenHyphens } from "./cjk-break";
import { registerReportFonts } from "./fonts";
import { ReportDocument } from "./report-document";
import type { TocKey } from "./report-document";
import type { EvidenceImage } from "./pdf-parts";
import type { ReportLogo } from "./report-logo";

const DEFAULT_FONT_BASE_URL = "/fonts";

interface GenerateInput {
  model: ReportModel;
  theme: ReportTheme;
  logo: ReportLogo | null;
  images: readonly EvidenceImage[];
  draftNotice: string | null;
  t: TFunction;
  locale: Locale;
}

export async function generateReportBlob(
  input: GenerateInput,
  fontBaseUrl: string = DEFAULT_FONT_BASE_URL,
): Promise<Blob> {
  registerReportFonts(fontBaseUrl, input.locale, input.theme.font);
  const isChinese = input.locale === "zh";
  const model = isChinese ? mapStrings(input.model, softenHyphens) : input.model;
  const t: TFunction = isChinese
    ? (source, vars) => softenHyphens(input.t(source, vars))
    : input.t;
  const draftNotice =
    isChinese && input.draftNotice !== null
      ? softenHyphens(input.draftNotice)
      : input.draftNotice;
  const found: Partial<Record<TocKey, number>> = {};
  const render = (pages: Partial<Record<TocKey, number>>) =>
    pdf(
      <ReportDocument
        model={model}
        theme={input.theme}
        logo={input.logo}
        images={input.images}
        draftNotice={draftNotice}
        t={t}
        locale={input.locale}
        pages={pages}
        onPage={(key, pageNumber) => {
          found[key] = pageNumber;
        }}
      />,
    ).toBlob();
  await render({});
  return render({ ...found });
}
