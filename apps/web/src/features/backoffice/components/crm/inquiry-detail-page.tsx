"use client";

import Link from "next/link";
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
  CONTACT_CONSENT_LABELS,
  INQUIRY_KIND_LABELS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_TONES,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  headcountLabel,
  sectorLabel,
  toOptions,
} from "../../lib/labels";
import type { InquiryDetail } from "../../lib/types";
import { useResource } from "../../lib/use-resource";
import { useUnsavedWarning } from "../../lib/use-unsaved-warning";
import { useAssignees } from "../assignees";
import { Badge } from "../badge";
import { Choice } from "../choice";
import { PageHeader } from "../page-header";
import { LoadError, Loading } from "../states";
import { useNotify } from "../toast";
import { DetailList, EmailLink, PhoneLink } from "./detail-list";

const BACK = { href: "/quan-tri/yeu-cau", label: "Danh sách yêu cầu" };

function toForm(inquiry: InquiryDetail) {
  return {
    status: inquiry.status,
    priority: inquiry.priority,
    assignedAdminId: inquiry.assignedAdminId ?? "",
    followUpAt: toDateTimeInput(inquiry.followUpAt),
    outcome: inquiry.outcome ?? "",
  };
}

function CareForm({
  inquiry,
  onSaved,
}: {
  inquiry: InquiryDetail;
  onSaved: (next: InquiryDetail) => void;
}) {
  const notify = useNotify();
  const assignees = useAssignees();
  const [saved, setSaved] = useState(() => toForm(inquiry));
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
      status: form.status,
      priority: form.priority,
      assignedAdminId:
        form.assignedAdminId === "" ? null : form.assignedAdminId,
      followUpAt: fromDateTimeInput(form.followUpAt),
      outcome: form.outcome.trim() === "" ? null : form.outcome.trim(),
    };
    setError(null);
    setIsSaving(true);
    try {
      const next = await sendJson<InquiryDetail>(
        "PATCH",
        `/admin/inquiries/${inquiry.id}`,
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
        <h2 className="text-base">Xử lý</h2>
        <Field label="Trạng thái" htmlFor="inquiry-status">
          <Choice
            id="inquiry-status"
            value={form.status}
            options={toOptions(INQUIRY_STATUS_LABELS)}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value as InquiryDetail["status"],
              })
            }
          />
        </Field>
        <Field label="Ưu tiên" htmlFor="inquiry-priority">
          <Choice
            id="inquiry-priority"
            value={form.priority}
            options={toOptions(PRIORITY_LABELS)}
            onChange={(event) =>
              setForm({
                ...form,
                priority: event.target.value as InquiryDetail["priority"],
              })
            }
          />
        </Field>
        <Field label="Người phụ trách" htmlFor="inquiry-assignee">
          <Choice
            id="inquiry-assignee"
            value={form.assignedAdminId}
            emptyLabel="Chưa giao"
            options={assignees.optionsWith(inquiry.assignedAdminId)}
            onChange={(event) =>
              setForm({ ...form, assignedAdminId: event.target.value })
            }
          />
        </Field>
        <Field
          label="Hẹn gọi lại"
          htmlFor="inquiry-follow-up"
          hint="Giờ Việt Nam. Để trống nếu chưa hẹn."
        >
          <Input
            id="inquiry-follow-up"
            type="datetime-local"
            value={form.followUpAt}
            onChange={(event) =>
              setForm({ ...form, followUpAt: event.target.value })
            }
          />
        </Field>
        <Field label="Kết quả" htmlFor="inquiry-outcome">
          <Textarea
            id="inquiry-outcome"
            rows={3}
            maxLength={500}
            value={form.outcome}
            onChange={(event) =>
              setForm({ ...form, outcome: event.target.value })
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

function Notes({
  inquiry,
  onSaved,
}: {
  inquiry: InquiryDetail;
  onSaved: (next: InquiryDetail) => void;
}) {
  const notify = useNotify();
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useUnsavedWarning(body.trim() !== "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || body.trim() === "") {
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      onSaved(
        await sendJson<InquiryDetail>(
          "POST",
          `/admin/inquiries/${inquiry.id}/notes`,
          { body: body.trim() },
        ),
      );
      setBody("");
      notify("Đã thêm ghi chú.");
    } catch (caught) {
      setError(errorMessage(caught, "Không thêm được ghi chú."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-base">Ghi chú nội bộ</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Ghi chú mới"
          htmlFor="inquiry-note"
          error={error ?? undefined}
        >
          <Textarea
            id="inquiry-note"
            rows={3}
            maxLength={2000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="secondary"
            loading={isSaving}
            disabled={body.trim() === ""}
          >
            Thêm ghi chú
          </Button>
        </div>
      </form>
      {inquiry.notes.length === 0 ? (
        <p className="text-sm text-muted">Chưa có ghi chú nào.</p>
      ) : (
        <ul className="divide-y divide-border">
          {inquiry.notes.map((note) => (
            <li key={note.id} className="py-3">
              <p className="whitespace-pre-line break-words text-sm">
                {note.body}
              </p>
              <p className="mt-1 text-xs text-muted">
                {note.adminName ?? "Tài khoản đã xóa"} ·{" "}
                {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function InquiryDetailPage({ id }: { id: string }) {
  const resource = useResource<InquiryDetail>(`/admin/inquiries/${id}`);
  const inquiry = resource.data;

  if (inquiry === null) {
    return (
      <div className="space-y-4">
        <PageHeader title="Chi tiết yêu cầu" back={BACK} />
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
        title={inquiry.code}
        back={BACK}
        description={`${INQUIRY_KIND_LABELS[inquiry.kind]} · gửi lúc ${formatDateTime(inquiry.createdAt)}`}
        actions={
          <>
            <Badge tone={INQUIRY_STATUS_TONES[inquiry.status]}>
              {INQUIRY_STATUS_LABELS[inquiry.status]}
            </Badge>
            <Badge tone={PRIORITY_TONES[inquiry.priority]}>
              {PRIORITY_LABELS[inquiry.priority]}
            </Badge>
          </>
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <h2 className="text-base">Thông tin khách gửi</h2>
            <DetailList
              items={[
                { label: "Doanh nghiệp", value: inquiry.companyName },
                {
                  label: "Email",
                  value: inquiry.contactEmail ? (
                    <EmailLink value={inquiry.contactEmail} />
                  ) : null,
                },
                {
                  label: "Điện thoại",
                  value: inquiry.contactPhone ? (
                    <PhoneLink value={inquiry.contactPhone} />
                  ) : null,
                },
                {
                  label: "Quy mô",
                  value: headcountLabel(inquiry.headcountTier),
                },
                { label: "Lĩnh vực", value: sectorLabel(inquiry.sector) },
                {
                  label: "Đồng ý liên hệ",
                  value: CONTACT_CONSENT_LABELS[inquiry.contactConsent],
                },
                { label: "Nội dung", value: inquiry.message },
                {
                  label: "Liên hệ lần đầu",
                  value: formatDateTime(inquiry.firstContactedAt),
                },
              ]}
            />
            {inquiry.companyId ? (
              <Link
                href={`/quan-tri/doanh-nghiep/${inquiry.companyId}`}
                className="inline-block text-sm text-primary-700 underline"
              >
                Mở hồ sơ doanh nghiệp
              </Link>
            ) : null}
          </Card>
          <Notes inquiry={inquiry} onSaved={resource.replace} />
        </div>
        <CareForm inquiry={inquiry} onSaved={resource.replace} />
      </div>
    </div>
  );
}
