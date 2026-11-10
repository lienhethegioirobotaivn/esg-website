"use client";

import { COMPANY_FIELD_LABELS } from "@/features/company";
import type { CompanyField } from "@/features/company";
import { Button, Modal } from "@/components/ui";
import { useT } from "@/features/locale";
import type { TFunction } from "@/features/locale";

import { REASON_LABELS } from "../lib/report-validation";
import type { QuestionIssue, ReportValidation } from "../lib/report-validation";

interface ExportIssuesDialogProps {
  validation: ReportValidation;
  onJumpToCompany: (field: CompanyField) => void;
  onJumpToQuestion: (issue: QuestionIssue) => void;
  onClose: () => void;
}

interface IssueGroup {
  readonly groupId: string;
  readonly heading: string;
  readonly issues: QuestionIssue[];
}

function groupIssues(
  issues: readonly QuestionIssue[],
  t: TFunction,
): IssueGroup[] {
  const groups: IssueGroup[] = [];
  for (const issue of issues) {
    const last = groups[groups.length - 1];
    if (last && last.groupId === issue.groupId) {
      last.issues.push(issue);
    } else {
      groups.push({
        groupId: issue.groupId,
        heading: `${t(issue.pillarName)} · ${t("Nhóm {position}: {title}", {
          position: issue.groupPosition,
          title: issue.groupTitle,
        })}`,
        issues: [issue],
      });
    }
  }
  return groups;
}

const linkClassName =
  "block w-full rounded-control border border-border px-3 py-2 text-left text-sm hover:border-border-strong hover:bg-surface-muted";

export function ExportIssuesDialog({
  validation,
  onJumpToCompany,
  onJumpToQuestion,
  onClose,
}: ExportIssuesDialogProps) {
  const t = useT();
  const { companyIssues, questionIssues } = validation;
  const total = companyIssues.length + questionIssues.length;
  const groups = groupIssues(questionIssues, t);

  return (
    <Modal title={t("Chưa thể xuất báo cáo")} onClose={onClose}>
      <p className="text-sm text-muted">
        {t(
          "Còn {total} mục cần hoàn thành. Bấm vào từng mục để chuyển tới vị trí cần điền.",
          { total },
        )}
      </p>

      {companyIssues.length > 0 ? (
        <section className="mt-5">
          <h3 className="text-sm">{t("Thông tin doanh nghiệp")}</h3>
          <ul className="mt-2 space-y-1.5">
            {companyIssues.map((issue) => (
              <li key={issue.field}>
                <button
                  type="button"
                  className={linkClassName}
                  onClick={() => onJumpToCompany(issue.field)}
                >
                  <span className="font-medium">
                    {t(COMPANY_FIELD_LABELS[issue.field])}
                  </span>
                  <span className="text-danger-600"> · {t(issue.message)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {groups.map((group) => (
        <section key={group.groupId} className="mt-5">
          <h3 className="text-sm">{group.heading}</h3>
          <ul className="mt-2 space-y-1.5">
            {group.issues.map((issue) => (
              <li key={issue.questionId}>
                <button
                  type="button"
                  className={linkClassName}
                  onClick={() => onJumpToQuestion(issue)}
                >
                  <span className="font-medium">
                    {t("Câu {number}.", { number: issue.questionNumber })}
                  </span>{" "}
                  <span className="line-clamp-2">{issue.questionText}</span>
                  <span className="block text-xs text-danger-600">
                    {issue.reasons.map((reason) => t(REASON_LABELS[reason])).join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-6 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t("Đóng")}
        </Button>
      </div>
    </Modal>
  );
}
