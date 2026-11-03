import { pdf } from "@react-pdf/renderer";
import type { ReportModel } from "@esg/shared";

import { registerReportFonts } from "./fonts";
import { ReportDocument } from "./report-document";
import type { TocKey } from "./report-document";
import type { EvidenceImage } from "./pdf-parts";
import type { ReportLogo } from "./report-logo";

const DEFAULT_FONT_BASE_URL = "/fonts";

interface GenerateInput {
  model: ReportModel;
  logo: ReportLogo | null;
  images: readonly EvidenceImage[];
  draftNotice: string | null;
}

export async function generateReportBlob(
  input: GenerateInput,
  fontBaseUrl: string = DEFAULT_FONT_BASE_URL,
): Promise<Blob> {
  registerReportFonts(fontBaseUrl);
  const found: Partial<Record<TocKey, number>> = {};
  const render = (pages: Partial<Record<TocKey, number>>) =>
    pdf(
      <ReportDocument
        model={input.model}
        logo={input.logo}
        images={input.images}
        draftNotice={input.draftNotice}
        pages={pages}
        onPage={(key, pageNumber) => {
          found[key] = pageNumber;
        }}
      />,
    ).toBlob();
  await render({});
  return render({ ...found });
}
