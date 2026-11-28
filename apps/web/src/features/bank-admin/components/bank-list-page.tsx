"use client";

import type { BankDetail, BankSummary } from "@esg/shared";
import { BANK_STATUS_LABELS } from "@esg/shared";
import { Copy, Download, FileUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, IconButton } from "@/components/ui";
import { Badge } from "@/features/backoffice/components/badge";
import { ConfirmDialog } from "@/features/backoffice/components/confirm-dialog";
import { DataTable } from "@/features/backoffice/components/data-table";
import { PageHeader } from "@/features/backoffice/components/page-header";
import {
  LoadError,
  Loading,
  Notice,
} from "@/features/backoffice/components/states";
import { useNotify } from "@/features/backoffice/components/toast";
import {
  downloadFile,
  errorMessage,
  sendJson,
} from "@/features/backoffice/lib/api";
import { formatDateTime } from "@/features/backoffice/lib/dates";
import { useResource } from "@/features/backoffice/lib/use-resource";

import { BANK_STATUS_TONES } from "../lib/bank";
import { ImportDialog } from "./import-dialog";

export function BankListPage() {
  const router = useRouter();
  const notify = useNotify();
  const resource = useResource<{ banks: BankSummary[] }>(
    "/admin/question-banks",
  );
  const [importing, setImporting] = useState(false);
  const [removing, setRemoving] = useState<BankSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const banks = resource.data?.banks ?? [];
  const published = banks.find((bank) => bank.status === "published");
  const draft = banks.find((bank) => bank.status === "draft");

  async function clone(bank: BankSummary) {
    setBusy(bank.id);
    try {
      const created = await sendJson<BankDetail>(
        "POST",
        "/admin/question-banks",
        { fromId: bank.id },
      );
      notify(`Đã tạo bản nháp ${created.bank.version}.`);
      router.push(`/quan-tri/bo-cau-hoi/${created.bank.id}`);
    } catch (caught) {
      notify(errorMessage(caught, "Không tạo được bản nháp."), "error");
      setBusy(null);
    }
  }

  async function download(bank: BankSummary) {
    try {
      await downloadFile(
        `/admin/question-banks/${bank.id}/export`,
        `bo-cau-hoi-${bank.version}.xlsx`,
      );
    } catch (caught) {
      notify(errorMessage(caught, "Không xuất được file Excel."), "error");
    }
  }

  async function remove(bank: BankSummary) {
    await sendJson("DELETE", `/admin/question-banks/${bank.id}`);
    setRemoving(null);
    notify(`Đã xóa bản nháp ${bank.version}.`);
    resource.reload();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bộ câu hỏi"
        description="Sửa trên bản nháp, kiểm tra rồi mới xuất bản. Báo cáo cũ giữ phiên bản đã dùng."
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<FileUp aria-hidden className="size-4" />}
              onClick={() => setImporting(true)}
            >
              Nhập từ Excel
            </Button>
            {draft ? (
              <Link
                href={`/quan-tri/bo-cau-hoi/${draft.id}`}
                className="inline-flex min-h-10 items-center rounded-control bg-primary-800 px-4 text-sm font-medium text-white hover:bg-primary-900"
              >
                Sửa tiếp bản nháp {draft.version}
              </Link>
            ) : published ? (
              <Button
                loading={busy === published.id}
                onClick={() => void clone(published)}
              >
                Sửa bộ câu hỏi
              </Button>
            ) : null}
          </>
        }
      />
      {resource.error ? (
        <LoadError error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data && banks.length === 0 ? (
        <Notice>
          Chưa có bộ câu hỏi nào. Tải Google Sheet về dạng Excel (.xlsx) rồi
          bấm “Nhập từ Excel”.
        </Notice>
      ) : null}
      {resource.data && banks.length > 0 ? (
        <DataTable
          label="Các phiên bản bộ câu hỏi"
          rows={banks}
          rowKey={(bank) => bank.id}
          busy={resource.loading}
          empty=""
          minWidth="min-w-200"
          columns={[
            {
              header: "Phiên bản",
              cell: (bank) => (
                <>
                  <Link
                    href={`/quan-tri/bo-cau-hoi/${bank.id}`}
                    className="font-semibold text-primary-700 hover:underline"
                  >
                    {bank.version}
                  </Link>
                  {bank.note ? (
                    <div className="max-w-80 break-words text-xs text-muted">
                      {bank.note}
                    </div>
                  ) : null}
                </>
              ),
            },
            {
              header: "Trạng thái",
              cell: (bank) => (
                <Badge tone={BANK_STATUS_TONES[bank.status]}>
                  {BANK_STATUS_LABELS[bank.status]}
                </Badge>
              ),
            },
            {
              header: "Câu hỏi",
              cell: (bank) => (
                <>
                  <div>
                    {bank.counts.approved}/{bank.counts.total} đã duyệt
                  </div>
                  {bank.counts.pending + bank.counts.changes > 0 ? (
                    <div className="text-xs text-muted">
                      {bank.counts.pending} chờ duyệt, {bank.counts.changes} cần
                      sửa
                    </div>
                  ) : null}
                </>
              ),
            },
            { header: "Báo cáo đang dùng", cell: (bank) => bank.reports },
            {
              header: "Cập nhật",
              cell: (bank) => formatDateTime(bank.updatedAt),
            },
            {
              header: <span className="sr-only">Thao tác</span>,
              cell: (bank) => (
                <div className="flex justify-end gap-1">
                  <Link
                    href={`/quan-tri/bo-cau-hoi/${bank.id}`}
                    className="inline-flex min-h-8 items-center rounded-control border border-border px-3 text-[0.8125rem] font-medium hover:bg-surface-muted"
                  >
                    {bank.status === "draft" ? "Sửa" : "Xem"}
                  </Link>
                  <IconButton
                    label={`Tạo bản nháp từ phiên bản ${bank.version}`}
                    disabled={busy !== null}
                    onClick={() => void clone(bank)}
                  >
                    <Copy aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Tải Excel phiên bản ${bank.version}`}
                    onClick={() => void download(bank)}
                  >
                    <Download aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    label={
                      bank.status === "draft"
                        ? `Xóa bản nháp ${bank.version}`
                        : "Chỉ xóa được bản nháp"
                    }
                    tone="danger"
                    disabled={bank.status !== "draft"}
                    onClick={() => setRemoving(bank)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </div>
              ),
            },
          ]}
        />
      ) : resource.loading ? (
        <Loading rows={3} />
      ) : null}
      {importing ? (
        <ImportDialog
          onClose={() => setImporting(false)}
          onImported={(bankId) => router.push(`/quan-tri/bo-cau-hoi/${bankId}`)}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Xóa bản nháp"
          confirmLabel="Xóa bản nháp"
          busyLabel="Đang xóa..."
          onConfirm={() => remove(removing)}
          onCancel={() => setRemoving(null)}
        >
          <p>
            Bản nháp {removing.version} và mọi chỉnh sửa trong đó sẽ bị xóa.
            Không hoàn tác được.
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
