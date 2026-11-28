"use client";

import type {
  BankDetail,
  BankQuestionView,
  BankSource,
  BankSummary,
} from "@esg/shared";
import { BANK_STATUS_LABELS } from "@esg/shared";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Card } from "@/components/ui";
import { Badge } from "@/features/backoffice/components/badge";
import { ConfirmDialog } from "@/features/backoffice/components/confirm-dialog";
import { PageHeader } from "@/features/backoffice/components/page-header";
import {
  LoadError,
  Loading,
  Notice,
} from "@/features/backoffice/components/states";
import { useNotify } from "@/features/backoffice/components/toast";
import {
  ApiError,
  downloadFile,
  errorMessage,
  getJson,
  sendJson,
} from "@/features/backoffice/lib/api";
import { formatDateTime } from "@/features/backoffice/lib/dates";
import { useQueryState } from "@/features/backoffice/lib/use-query-state";
import { useResource } from "@/features/backoffice/lib/use-resource";
import {
  UNSAVED_MESSAGE,
  useUnsavedWarning,
} from "@/features/backoffice/lib/use-unsaved-warning";

import {
  BANK_STATUS_TONES,
  NO_FILTERS,
  isBankSource,
  movedIds,
  ofSource,
  shorten,
  type QuestionFilters,
} from "../lib/bank";
import type { QuestionForm } from "../lib/question-form";
import type { BulkPatch } from "./bulk-bar";
import { PublishDialog } from "./publish-dialog";
import { QuestionEditor, type NewQuestionSeed } from "./question-editor";
import { QuestionList } from "./question-list";
import { VersionDialog } from "./version-dialog";

const NEW_KEY = "moi";
const LIST_PATH = "/quan-tri/bo-cau-hoi";
const STALE_CODES = ["bank_locked", "order_outdated", "question_not_found"];
const BLANK_SEED: NewQuestionSeed = { template: null, after: "end" };
const WIDE_QUERY = "(min-width: 64rem)";

type DialogName = "publish" | "version" | "remove-bank";

export function BankEditorPage({ id }: { id: string }) {
  const router = useRouter();
  const notify = useNotify();
  const query = useQueryState();
  const resource = useResource<BankDetail>(`/admin/question-banks/${id}`);
  const { replace, reload } = resource;
  const [filters, setFilters] = useState<QuestionFilters>(NO_FILTERS);
  const [dirty, setDirty] = useState(false);
  const [seed, setSeed] = useState({ ...BLANK_SEED, key: 0 });
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [removing, setRemoving] = useState<BankQuestionView[] | null>(null);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useUnsavedWarning(dirty);

  const changeFilters = useCallback(
    (patch: Partial<QuestionFilters>) =>
      setFilters((previous) => ({ ...previous, ...patch })),
    [],
  );

  const selection = query.get("cau");

  useEffect(() => {
    if (selection !== "" && !window.matchMedia(WIDE_QUERY).matches) {
      editorRef.current?.scrollIntoView({ block: "start" });
    }
  }, [selection]);

  const detail = resource.data;
  if (detail === null) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Bộ câu hỏi"
          back={{ href: LIST_PATH, label: "Các phiên bản" }}
        />
        {resource.error ? (
          <LoadError error={resource.error} onRetry={reload} />
        ) : (
          <Loading />
        )}
      </div>
    );
  }

  const { bank, questions } = detail;
  const readOnly = bank.status !== "draft";
  const isNew = selection === NEW_KEY && !readOnly;
  const selected =
    questions.find(
      (question) => question.id === selection || question.code === selection,
    ) ?? null;
  const param = query.get("phan");
  const source: BankSource = isBankSource(param)
    ? param
    : (selected?.source ?? "COMMON");

  function leave(): boolean {
    return !dirty || window.confirm(UNSAVED_MESSAGE);
  }

  function show(next: { source: BankSource; selection: string }) {
    setDirty(false);
    query.set({ phan: next.source, cau: next.selection });
  }

  function select(question: BankQuestionView) {
    if (question.id !== selected?.id && leave()) {
      show({ source: question.source, selection: question.id });
    }
  }

  function selectCode(code: string) {
    const target = questions.find((question) => question.code === code);
    if (!target) {
      notify(`Không tìm thấy câu ${code} trong phiên bản này.`, "error");
      return;
    }
    setDialog(null);
    select(target);
  }

  function startNew(next: NewQuestionSeed, target: BankSource) {
    if (leave()) {
      setSeed((previous) => ({ ...next, key: previous.key + 1 }));
      show({ source: target, selection: NEW_KEY });
    }
  }

  async function mutate(
    method: "POST" | "PATCH" | "PUT",
    path: string,
    body: unknown,
  ): Promise<BankDetail> {
    try {
      const next = await sendJson<BankDetail>(
        method,
        `/admin/question-banks/${id}${path}`,
        body,
      );
      replace(next);
      return next;
    } catch (caught) {
      if (caught instanceof ApiError && STALE_CODES.includes(caught.code)) {
        reload();
      }
      throw caught;
    }
  }

  async function create(payload: Record<string, unknown>) {
    const before = new Set(questions.map((question) => question.id));
    const next = await mutate("POST", "/questions", payload);
    const added = next.questions.find((question) => !before.has(question.id));
    if (added) {
      notify(`Đã thêm câu ${added.code}.`);
      show({ source: added.source, selection: added.id });
    }
  }

  async function reorder(target: BankSource, ids: string[]) {
    setBusy(true);
    try {
      await mutate("PUT", "/order", { source: target, ids });
    } catch (caught) {
      notify(errorMessage(caught, "Không đổi được thứ tự."), "error");
    } finally {
      setBusy(false);
    }
  }

  function step(question: BankQuestionView, direction: -1 | 1) {
    const ids = ofSource(questions, question.source).map((item) => item.id);
    const index = ids.indexOf(question.id);
    void reorder(
      question.source,
      movedIds(ids, question.id, index + direction),
    );
  }

  function move(question: BankQuestionView, after: string) {
    const ids = ofSource(questions, question.source).map((item) => item.id);
    const rest = ids.filter((item) => item !== question.id);
    const target = after === "start" ? 0 : rest.indexOf(after) + 1;
    return reorder(question.source, movedIds(ids, question.id, target));
  }

  async function bulk(ids: string[], patch: BulkPatch) {
    setBusy(true);
    try {
      await mutate("POST", "/questions/bulk", { ids, patch });
      notify(`Đã cập nhật ${ids.length} câu.`);
    } catch (caught) {
      notify(errorMessage(caught, "Không cập nhật được."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestions(list: BankQuestionView[]) {
    const ids = list.map((question) => question.id);
    await mutate("POST", "/questions/delete", { ids });
    setRemoving(null);
    notify(`Đã xóa ${ids.length} câu.`);
    if (selected && ids.includes(selected.id)) {
      show({ source: selected.source, selection: "" });
    }
  }

  function duplicate(question: BankQuestionView, form: QuestionForm) {
    startNew({ template: form, after: question.id }, question.source);
  }

  async function download() {
    try {
      await downloadFile(
        `/admin/question-banks/${id}/export`,
        `bo-cau-hoi-${bank.version}.xlsx`,
      );
    } catch (caught) {
      notify(errorMessage(caught, "Không xuất được file Excel."), "error");
    }
  }

  async function openDraft() {
    setBusy(true);
    try {
      const { banks } = await getJson<{ banks: BankSummary[] }>(
        "/admin/question-banks",
      );
      const draft = banks.find((item) => item.status === "draft");
      const target =
        draft?.id ??
        (
          await sendJson<BankDetail>("POST", "/admin/question-banks", {
            fromId: bank.id,
          })
        ).bank.id;
      const search = new URLSearchParams({ phan: source });
      if (selected) {
        search.set("cau", selected.code);
      }
      notify(draft ? "Đã mở bản nháp đang sửa." : "Đã tạo bản nháp mới.");
      router.push(`${LIST_PATH}/${target}?${search.toString()}`);
    } catch (caught) {
      notify(errorMessage(caught, "Không mở được bản nháp."), "error");
      setBusy(false);
    }
  }

  function openPublish() {
    if (dirty) {
      notify(
        "Hãy lưu hoặc hoàn tác câu đang sửa trước khi xuất bản.",
        "error",
      );
      return;
    }
    setDialog("publish");
  }

  const referenced = removing?.filter((question) => question.usedByReport) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Bộ câu hỏi ${bank.version}`}
        back={{ href: LIST_PATH, label: "Các phiên bản" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={BANK_STATUS_TONES[bank.status]}>
              {BANK_STATUS_LABELS[bank.status]}
            </Badge>
            <span>
              {bank.counts.approved}/{bank.counts.total} câu đã duyệt
            </span>
            <span>Cập nhật {formatDateTime(bank.updatedAt)}</span>
            {bank.note ? (
              <span className="break-words">· {bank.note}</span>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<Download aria-hidden className="size-4" />}
              onClick={() => void download()}
            >
              Tải Excel
            </Button>
            {readOnly ? (
              <>
                {bank.status === "archived" ? (
                  <Button variant="secondary" onClick={openPublish}>
                    Xuất bản lại
                  </Button>
                ) : null}
                <Button loading={busy} onClick={() => void openDraft()}>
                  Sửa bộ câu hỏi
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  leadingIcon={<Pencil aria-hidden className="size-4" />}
                  onClick={() => setDialog("version")}
                >
                  Phiên bản & ghi chú
                </Button>
                <Button
                  variant="secondary"
                  leadingIcon={<Trash2 aria-hidden className="size-4" />}
                  onClick={() => setDialog("remove-bank")}
                >
                  Xóa bản nháp
                </Button>
                <Button onClick={openPublish}>Kiểm tra & xuất bản</Button>
              </>
            )}
          </>
        }
      />
      {resource.error ? (
        <LoadError error={resource.error} onRetry={reload} />
      ) : null}
      {readOnly ? (
        <Notice>
          Phiên bản này chỉ để xem. Bấm “Sửa bộ câu hỏi” để chỉnh trên bản
          nháp; khảo sát không đổi cho tới khi bạn xuất bản.
        </Notice>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <QuestionList
          detail={detail}
          source={source}
          filters={filters}
          selectedId={selected?.id ?? null}
          readOnly={readOnly}
          busy={busy}
          onSource={(next) => {
            if (leave()) {
              setFilters(NO_FILTERS);
              show({ source: next, selection: "" });
            }
          }}
          onFilters={changeFilters}
          onSelect={select}
          onAdd={() => startNew(BLANK_SEED, source)}
          onStep={step}
          onBulk={(ids, patch) => void bulk(ids, patch)}
          onDelete={setRemoving}
        />
        <div ref={editorRef} className="min-w-0 scroll-mt-4">
          {isNew || selected ? (
            <QuestionEditor
              key={isNew ? `${NEW_KEY}-${source}-${seed.key}` : selected?.id}
              detail={detail}
              question={isNew ? null : selected}
              source={isNew ? source : (selected?.source ?? source)}
              seed={isNew ? seed : BLANK_SEED}
              readOnly={readOnly}
              onDirtyChange={setDirty}
              onCreate={create}
              onUpdate={(questionId, payload) =>
                mutate("PATCH", `/questions/${questionId}`, payload)
              }
              onMove={move}
              onDuplicate={duplicate}
              onDelete={(question) => setRemoving([question])}
              onCancelNew={() => show({ source, selection: "" })}
            />
          ) : (
            <Card className="p-6 text-sm text-muted">
              {readOnly
                ? "Chọn một câu trong danh sách để xem chi tiết."
                : "Chọn một câu trong danh sách để sửa, hoặc bấm “Thêm câu hỏi”."}
            </Card>
          )}
        </div>
      </div>
      {dialog === "publish" ? (
        <PublishDialog
          detail={detail}
          onClose={() => setDialog(null)}
          onSelect={selectCode}
          onPublished={(next) => {
            replace(next);
            setDialog(null);
            notify(`Đã xuất bản phiên bản ${next.bank.version}.`);
          }}
        />
      ) : null}
      {dialog === "version" ? (
        <VersionDialog
          bank={bank}
          onClose={() => setDialog(null)}
          onSave={async (values) => {
            await mutate("PATCH", "", values);
            setDialog(null);
            notify("Đã lưu thông tin phiên bản.");
          }}
        />
      ) : null}
      {dialog === "remove-bank" ? (
        <ConfirmDialog
          title="Xóa bản nháp"
          confirmLabel="Xóa bản nháp"
          busyLabel="Đang xóa..."
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            await sendJson("DELETE", `/admin/question-banks/${id}`);
            setDirty(false);
            notify(`Đã xóa bản nháp ${bank.version}.`);
            router.replace(LIST_PATH);
          }}
        >
          <p>
            Bản nháp {bank.version} và mọi chỉnh sửa trong đó sẽ bị xóa.
            Không hoàn tác được.
          </p>
        </ConfirmDialog>
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Xóa câu hỏi"
          confirmLabel={`Xóa ${removing.length} câu`}
          busyLabel="Đang xóa..."
          onCancel={() => setRemoving(null)}
          onConfirm={() => removeQuestions(removing)}
        >
          <p className="break-words">
            {removing.length === 1
              ? `${removing[0]?.code}: ${shorten(removing[0]?.text ?? "", 160)}`
              : removing.map((question) => question.code).join(", ")}
          </p>
          <p>
            Câu bị xóa khỏi bản nháp này. Các phiên bản đã xuất bản không đổi.
          </p>
          {referenced.length > 0 ? (
            <p className="text-danger-600">
              Báo cáo đang dùng{" "}
              {referenced.map((question) => question.code).join(", ")}. Xóa sẽ
              làm báo cáo thiếu dữ liệu.
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
