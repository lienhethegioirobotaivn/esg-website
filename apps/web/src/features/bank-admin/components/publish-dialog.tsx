"use client";

import type { BankCheckResult, BankDetail } from "@esg/shared";
import { useState } from "react";

import { Button, Modal } from "@/components/ui";
import {
  LoadError,
  Loading,
  Notice,
} from "@/features/backoffice/components/states";
import {
  ApiError,
  errorMessage,
  sendJson,
} from "@/features/backoffice/lib/api";

import { useBankCheck } from "../lib/use-bank-check";
import { IssueList } from "./issue-list";

const CHANGE_LABELS = [
  ["added", "Thêm mới"],
  ["changed", "Có sửa"],
  ["removed", "Đã bỏ"],
] as const;

function ChangeSummary({
  changes,
  onSelect,
}: {
  changes: BankCheckResult["changes"];
  onSelect: (code: string) => void;
}) {
  if (changes.comparedTo === null) {
    return null;
  }
  const empty = CHANGE_LABELS.every(([key]) => changes[key].length === 0);
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        So với phiên bản đang xuất bản ({changes.comparedTo})
      </h3>
      {empty ? (
        <p className="text-sm text-muted">Không có câu nào thay đổi.</p>
      ) : (
        <dl className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
          {CHANGE_LABELS.map(([key, label]) =>
            changes[key].length === 0 ? null : (
              <div key={key}>
                <dt className="inline font-medium">
                  {label} ({changes[key].length}):{" "}
                </dt>
                <dd className="inline">
                  {changes[key].map((code) =>
                    key === "removed" ? (
                      <span key={code} className="mr-2">
                        {code}
                      </span>
                    ) : (
                      <button
                        key={code}
                        type="button"
                        className="mr-2 text-primary-700 underline"
                        onClick={() => onSelect(code)}
                      >
                        {code}
                      </button>
                    ),
                  )}
                </dd>
              </div>
            ),
          )}
        </dl>
      )}
    </section>
  );
}

export function PublishDialog({
  detail,
  onClose,
  onSelect,
  onPublished,
}: {
  detail: BankDetail;
  onClose: () => void;
  onSelect: (code: string) => void;
  onPublished: (detail: BankDetail) => void;
}) {
  const { bank } = detail;
  const check = useBankCheck(bank.id);
  const [publishing, setPublishing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const result = check.result;
  const errors =
    result?.issues.filter((issue) => issue.severity === "error").length ?? 0;

  async function publish() {
    setPublishing(true);
    setFailure(null);
    try {
      onPublished(
        await sendJson<BankDetail>(
          "POST",
          `/admin/question-banks/${bank.id}/publish`,
        ),
      );
    } catch (caught) {
      setFailure(errorMessage(caught, "Không xuất bản được."));
      setPublishing(false);
      if (caught instanceof ApiError && caught.code === "bank_invalid") {
        check.reload();
      }
    }
  }

  return (
    <Modal
      title={`Kiểm tra & xuất bản phiên bản ${bank.version}`}
      onClose={onClose}
      dismissible={!publishing}
    >
      <div className="space-y-4">
        {check.error ? (
          <LoadError error={check.error} onRetry={check.reload} />
        ) : null}
        {check.loading ? <Loading rows={3} /> : null}
        {result ? (
          <>
            <p className="text-sm">
              <strong>
                {bank.counts.approved}/{bank.counts.total}
              </strong>{" "}
              câu đã duyệt. Chỉ câu đã duyệt hiện trong khảo sát.
            </p>
            <Notice tone={result.ok ? "info" : "warning"}>
              {result.ok
                ? result.issues.length > 0
                  ? "Hợp lệ, có thể xuất bản. Hãy đọc các lưu ý bên dưới."
                  : "Hợp lệ, có thể xuất bản."
                : `Còn ${errors} lỗi cần sửa trước khi xuất bản.`}
            </Notice>
            {result.issues.length > 0 ? (
              <IssueList issues={result.issues} onSelect={onSelect} />
            ) : null}
            <ChangeSummary changes={result.changes} onSelect={onSelect} />
            <p className="text-sm text-muted">
              Xuất bản sẽ thay bộ câu hỏi đang dùng. Báo cáo đã tạo vẫn giữ
              phiên bản cũ. Muốn sửa tiếp thì tạo bản nháp mới.
            </p>
          </>
        ) : null}
        {failure ? (
          <p role="alert" className="text-sm text-danger-600">
            {failure}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={publishing} onClick={onClose}>
            Đóng
          </Button>
          <Button
            loading={publishing}
            disabled={!result?.ok || check.loading}
            onClick={() => void publish()}
          >
            Xuất bản
          </Button>
        </div>
      </div>
    </Modal>
  );
}
