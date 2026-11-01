import { pdf } from "@react-pdf/renderer";

import type { ReportData } from "../lib/report-data";
import { registerReportFonts } from "./fonts";
import type { ReportLogo } from "./report-logo";
import { ReportDocument } from "./report-document";

const DEFAULT_FONT_BASE_URL = "/fonts";

export async function generateReportBlob(
  data: ReportData,
  fontBaseUrl: string = DEFAULT_FONT_BASE_URL,
  logo: ReportLogo | null = null,
): Promise<Blob> {
  registerReportFonts(fontBaseUrl);
  return pdf(<ReportDocument data={data} logo={logo} />).toBlob();
}
