"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Field, Input, Textarea } from "@/components/ui";

import { errorMessage, sendJson } from "../../lib/api";
import {
  formatDateTime,
  fromDateTimeInput,
  toDateTimeInput,
} from "../../lib/dates";
import {
  CARE_STATUS_LABELS,
  CARE_STATUS_TONES,
  consentKindLabel,
  headcountLabel,
  reportStatusLabel,
  sectorLabel,
  toOptions,
} from "../../lib/labels";
import type { CustomerDetail } from "../../lib/types";
import { useResource } from "../../lib/use-resource";
import { useUnsavedWarning } from "../../lib/use-unsaved-warning";
import { useAssignees } from "../assignees";
import { Badge } from "../badge";
import { Choice } from "../choice";
import { DataTable } from "../data-table";
import { PageHeader } from "../page-header";
import { LoadError, Loading } from "../states";
import { useNotify } from "../toast";
import { DetailList, EmailLink, PhoneLink } from "./detail-list";

const BACK = {
  href: "/quan-tri/doanh-nghiep",
  label: "Danh sách doanh nghiệp",
};

function toForm(customer: CustomerDetail) {
  return {
    careStatus: customer.careStatus,
    assignedAdminId: customer.assignedAdminId ?? "",
    nextContactAt: toDateTimeInput(customer.nextContactAt),
    careNote: customer.careNote ?? "",
  };
}

function CareForm({
  customer,
  onSaved,
}: {
  customer: CustomerDetail;
  onSaved: (next: CustomerDetail) => void;
}) {
  const notify = useNotify();
  const assignees = useAssignees();
  const [saved, setSaved] = useState(() => toForm(customer));
  const [form, setForm] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const changed = (Object.keys(form) as (keyof typeof form)[]).filter(
    (key) => form[key] !== saved[key],
  );
  useUnsavedWarning(changed.length > 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || changed.length === 0) {
      return;
    }
    const values = {
      careStatus: form.careStatus,
      assignedAdminId:
        form.assignedAdminId === "" ? null : form.assignedAdminId,
      nextContactAt: fromDateTimeInput(form.nextContactAt),
      careNote: form.careNote.trim() === "" ? null : form.careNote.trim(),
    };
    setError(null);
    setIsSaving(true);
    try {
      const next = await sendJson<CustomerDetail>(
        "PATCH",
        `/admin/customers/${customer.id}`,
        Object.fromEntries(changed.map((key) => [key, values[key]])),
      );
      setSaved(toForm(next));
      setForm(toForm(next));
      onSaved(next);
      notify("Đã lưu thay đổi.");
    } catch (caught) {
      setError(errorMessage(caught, "Không lưu được thay đổi."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-base">Chăm sóc khách hàng</h2>
        <Field label="Trạng thái chăm sóc" htmlFor="care-status">
          <Choice
            id="care-status"
            value={form.careStatus}
            options={toOptions(CARE_STATUS_LABELS)}
            onChange={(event) =>
              setForm({
                ...form,
                careStatus: event.target.value as CustomerDetail["careStatus"],
              })
            }
          />
        </Field>
        <Field label="Người phụ trách" htmlFor="care-assignee">
          <Choice
            id="care-assignee"
            value={form.assignedAdminId}
            emptyLabel="Chưa giao"
            options={assignees.optionsWith(customer.assignedAdminId)}
            onChange={(event) =>
              setForm({ ...form, assignedAdminId: event.target.value })
            }
          />
        </Field>
        <Field
          label="Liên hệ tiếp theo"
          htmlFor="care-next"
          hint="Giờ Việt Nam. Để trống nếu chưa hẹn."
        >
          <Input
            id="care-next"
            type="datetime-local"
            value={form.nextContactAt}
            onChange={(event) =>
              setForm({ ...form, nextContactAt: event.target.value })
            }
          />
        </Field>
        <Field label="Ghi chú chăm sóc" htmlFor="care-note">
          <Textarea
            id="care-note"
            rows={5}
            maxLength={2000}
            value={form.careNote}
            onChange={(event) =>
              setForm({ ...form, careNote: event.target.value })
            }
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          loading={isSaving}
          disabled={changed.length === 0}
        >
          Lưu thay đổi
        </Button>
      </form>
    </Card>
  );
}

export function CustomerDetailPage({ id }: { id: string }) {
  const resource = useResource<CustomerDetail>(`/admin/customers/${id}`);
  const customer = resource.data;

  if (customer === null) {
    return (
      <div className="space-y-4">
        <PageHeader title="Hồ sơ doanh nghiệp" back={BACK} />
        {resource.error ? (
          <LoadError error={resource.error} onRetry={resource.reload} />
        ) : (
          <Loading />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={customer.legalName}
        back={BACK}
        description={`Tạo ngày ${formatDateTime(customer.createdAt)}`}
        actions={
          <Badge tone={CARE_STATUS_TONES[customer.careStatus]}>
            {CARE_STATUS_LABELS[customer.careStatus]}
          </Badge>
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Card className="space-y-4 p-5">
            <h2 className="text-base">Thông tin doanh nghiệp</h2>
            <DetailList
              items={[
                { label: "Tên thương mại", value: customer.tradeName },
                { label: "Mã số thuế", value: customer.taxCode },
                {
                  label: "Ngành chính",
                  value: sectorLabel(customer.primarySector),
                },
                {
                  label: "Quy mô",
                  value: headcountLabel(customer.headcountTier),
                },
                { label: "Người liên hệ", value: customer.contactName },
                {
                  label: "Email",
                  value: customer.contactEmail ? (
                    <EmailLink value={customer.contactEmail} />
                  ) : null,
                },
                {
                  label: "Điện thoại",
                  value: customer.contactPhone ? (
                    <PhoneLink value={customer.contactPhone} />
                  ) : null,
                },
                {
                  label: "Liên hệ lần đầu",
                  value: formatDateTime(customer.firstContactedAt),
                },
              ]}
            />
          </Card>
          <section className="space-y-2">
            <h2 className="text-base">Báo cáo</h2>
            <DataTable
              label="Báo cáo của doanh nghiệp"
              minWidth="min-w-120"
              rows={customer.reports}
              rowKey={(row) => row.code}
              empty="Chưa có báo cáo nào."
              columns={[
                { header: "Mã báo cáo", cell: (row) => row.code },
                {
                  header: "Trạng thái",
                  cell: (row) => reportStatusLabel(row.status),
                },
                {
                  header: "Ngày tạo",
                  cell: (row) => formatDateTime(row.createdAt),
                },
                {
                  header: "Xuất lần cuối",
                  cell: (row) => formatDateTime(row.lastExportAt),
                },
              ]}
            />
          </section>
          <section className="space-y-2">
            <h2 className="text-base">Lịch sử đồng ý</h2>
            <DataTable
              label="Lịch sử đồng ý"
              minWidth="min-w-120"
              rows={customer.consents}
              rowKey={(row) =>
                `${row.kind}-${row.grantedAt}-${row.textVersion}-${row.granted}`
              }
              empty="Chưa ghi nhận đồng ý nào."
              columns={[
                {
                  header: "Nội dung",
                  cell: (row) => consentKindLabel(row.kind),
                },
                {
                  header: "Trả lời",
                  cell: (row) => (
                    <Badge tone={row.granted ? "green" : "gray"}>
                      {row.granted ? "Đồng ý" : "Không đồng ý"}
                    </Badge>
                  ),
                },
                {
                  header: "Thời điểm",
                  cell: (row) => formatDateTime(row.grantedAt),
                },
                {
                  header: "Phiên bản nội dung",
                  cell: (row) => row.textVersion,
                },
              ]}
            />
          </section>
        </div>
        <CareForm customer={customer} onSaved={resource.replace} />
      </div>
    </div>
  );
}
