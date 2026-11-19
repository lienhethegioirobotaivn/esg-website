import type { ReportSnapshot } from "@esg/shared";

import { saveReportCode } from "@/features/company";

import { clearBrandTheme, saveBrandTheme } from "./brand-theme-storage";
import { saveDraft } from "./draft-storage";
import { savePlan } from "./plan-storage";

export function applyReportSnapshot(
  snapshot: ReportSnapshot,
  reportCode: string,
): boolean {
  const draftSaved = saveDraft({
    company: snapshot.company,
    answers: snapshot.answers,
    activeGroupId: snapshot.activeGroupId,
  });
  if (!draftSaved) {
    return false;
  }
  savePlan(snapshot.plan);
  if (snapshot.theme === null) {
    clearBrandTheme();
  } else {
    saveBrandTheme(snapshot.theme);
  }
  saveReportCode(reportCode);
  return true;
}
