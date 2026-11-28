"use client";

import type { FileHealth } from "@esg/shared";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Card } from "@/components/ui";
import { formatFileSize } from "@/lib/format";

import { sendJson } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { useResource } from "../../lib/use-resource";
import { ConfirmDialog } from "../confirm-dialog";
import { DataTable } from "../data-table";
import { LoadError, Loading, Notice } from "../states";
import { useNotify } from "../toast";

const KIND_LABELS: Readonly<Record<string, string>> = {
  logo: "Logo",
  evidence: "Minh chứng",
  export_pdf: "Báo cáo PDF",
  export_docx: "Báo cáo Word",
  post_image: "Ảnh trong bài viết",
  post_cover: "Ảnh bìa bài viết",
};

const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind;

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <Card className="min-w-44 flex-1 p-4">
      <p className="text-2xl font-bold tabular-nums text-primary-800">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </Card>
  );
}

export function FilesSection() {
  const notify = useNotify();
  const resource = useResource<FileHealth>("/admin/files/health");
  const [confirming, setConfirming] = useState(false);
  const health = resource.data;

  async function removeUntracked() {
    const { removed } = await sendJson<{ removed: number }>(
      "DELETE",
      "/admin/files/untracked",
    );
    setConfirming(false);
    notify(`Đã xóa ${removed} tệp thừa.`);
    resource.reload();
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base">Tệp lưu trữ</h2>
        <Button
          variant="ghost"
          size="sm"
          loading={resource.loading}
          leadingIcon={<RefreshCw aria-hidden className="size-4" />}
          onClick={resource.reload}
        >
          Kiểm tra lại
        </Button>
      </div>
      {resource.error ? (
        <LoadError error={resource.error} onRetry={resource.reload} />
      ) : null}
      {health ? (
        <>
          <p className="text-sm text-muted">
            Đối chiếu database với ổ đĩa lúc {formatDateTime(health.checkedAt)}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Figure value={health.missingTotal} label="Tệp bị mất trên đĩa" />
            <Figure
              value={health.untracked.count}
              label={`Tệp thừa trên đĩa (${formatFileSize(health.untracked.bytes)})`}
            />
            <Figure value={health.pendingPurge} label="Tệp đang chờ dọn" />
          </div>
          {health.missingTotal > 0 ? (
            <Notice tone="warning">
              Có tệp đã ghi trong database nhưng không còn trên đĩa. Hãy khôi
              phục từ bản sao lưu.
            </Notice>
          ) : null}
          {health.untracked.removable > 0 ? (
            <Button
              variant="secondary"
              leadingIcon={<Trash2 aria-hidden className="size-4" />}
              onClick={() => setConfirming(true)}
            >
              Xóa {health.untracked.removable} tệp thừa cũ hơn 24 giờ
            </Button>
          ) : null}
          {health.missing.length > 0 ? (
            <DataTable
              label="Tệp bị mất"
              rows={health.missing}
              rowKey={(file) => file.id}
              empty=""
              minWidth="min-w-120"
              columns={[
                { header: "Loại", cell: (file) => kindLabel(file.kind) },
                { header: "Tên tệp", cell: (file) => file.originalName },
                { header: "Mã tệp", cell: (file) => file.id },
                {
                  header: "Ngày tạo",
                  cell: (file) => formatDateTime(file.createdAt),
                },
              ]}
            />
          ) : null}
          <DataTable
            label="Dung lượng theo loại tệp"
            rows={health.kinds}
            rowKey={(row) => row.kind}
            empty="Chưa lưu tệp nào."
            minWidth="min-w-100"
            columns={[
              { header: "Loại tệp", cell: (row) => kindLabel(row.kind) },
              { header: "Số tệp", cell: (row) => row.count },
              {
                header: "Dung lượng",
                cell: (row) => formatFileSize(row.bytes),
              },
            ]}
          />
        </>
      ) : resource.loading ? (
        <Loading rows={3} />
      ) : null}
      {confirming && health ? (
        <ConfirmDialog
          title="Xóa tệp thừa"
          confirmLabel="Xóa tệp thừa"
          busyLabel="Đang xóa..."
          onConfirm={removeUntracked}
          onCancel={() => setConfirming(false)}
        >
          <p>
            Xóa hẳn {health.untracked.removable} tệp có trên đĩa nhưng không có
            trong database. Nên sao lưu trước nếu bạn vừa khôi phục database.
          </p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
