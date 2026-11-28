"use client";

import type { BankImportResult } from "@esg/shared";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Field, Input, Modal } from "@/components/ui";
import { controlClassName } from "@/components/ui/control-styles";
import { Notice } from "@/features/backoffice/components/states";
import { useNotify } from "@/features/backoffice/components/toast";
import { errorMessage, sendForm } from "@/features/backoffice/lib/api";

import { IssueList } from "./issue-list";

const MAX_BYTES = 5 * 1024 * 1024;

export function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (bankId: string) => void;
}) {
  const notify = useNotify();
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<BankImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooLarge = file !== null && file.size > MAX_BYTES;

  async function run(dryRun: boolean) {
    if (file === null || busy) {
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("version", version.trim());
    if (note.trim() !== "") {
      form.set("note", note.trim());
    }
    form.set("dryRun", String(dryRun));
    setError(null);
    setBusy(true);
    try {
      const next = await sendForm<BankImportResult>(
        "/admin/question-banks/import",
        form,
      );
      setResult(next);
      if (next.imported && next.bankId !== null) {
        notify(`Đã nhập ${next.questions} câu vào bản nháp ${next.version}.`);
        onImported(next.bankId);
        return;
      }
      setBusy(false);
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          "Không đọc được file. Nếu bạn vừa sửa file, hãy chọn lại.",
        ),
      );
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(true);
  }

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Modal
      title="Nhập bộ câu hỏi từ Excel"
      onClose={onClose}
      dismissible={!busy}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="File Excel (.xlsx)"
          htmlFor="import-file"
          required
          hint="Trong Google Sheet chọn Tệp → Tải xuống → Microsoft Excel. File xuất từ trang này cũng nhập lại được."
          error={tooLarge ? "File lớn hơn 5 MB." : undefined}
        >
          <input
            id="import-file"
            type="file"
            accept=".xlsx"
            className={controlClassName}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              reset();
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Số phiên bản"
            htmlFor="import-version"
            hint="Để trống để lấy số ghi trong file."
          >
            <Input
              id="import-version"
              maxLength={30}
              value={version}
              onChange={(event) => {
                setVersion(event.target.value);
                reset();
              }}
            />
          </Field>
          <Field
            label="Ghi chú"
            htmlFor="import-note"
            hint="Ví dụ: cập nhật theo góp ý tháng 11."
          >
            <Input
              id="import-note"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="space-y-3" aria-live="polite">
            <p className="text-sm">
              Phiên bản{" "}
              <strong>{result.version ?? "chưa xác định được"}</strong>:{" "}
              {result.questions} câu hỏi, {result.groups} nhóm.{" "}
              {result.ok
                ? "File hợp lệ, có thể nhập."
                : "File còn lỗi, chưa nhập được."}
            </p>
            {result.replacesDraft && result.ok ? (
              <Notice tone="warning">
                Đã có bản nháp {result.version}. Nhập file sẽ{" "}
                <strong>ghi đè toàn bộ</strong> bản nháp đó.
              </Notice>
            ) : null}
            {result.issues.length > 0 ? (
              <IssueList issues={result.issues} />
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant={result?.ok ? "secondary" : "primary"}
            loading={busy && !result?.ok}
            disabled={file === null || tooLarge || busy}
          >
            Kiểm tra file
          </Button>
          {result?.ok ? (
            <Button loading={busy} onClick={() => void run(false)}>
              {result.replacesDraft
                ? "Ghi đè bản nháp"
                : "Nhập thành bản nháp"}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
