"use client";

import { Check, LoaderCircle, Search, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Field, Input, Select } from "@/components/ui";
import { headcountOptions, industryOptions } from "@/data";
import { saveDraft } from "@/features/survey/lib/draft-storage";

import { CATALOG } from "../catalog";
import type { CatalogEntry } from "../catalog";
import { AiDataRunError, runAiData } from "../lib/run-client";
import type { AiDataResult } from "../types";
import { ReviewTable } from "./review-table";

type Status = "idle" | "running" | "done" | "error";

interface FormState {
  name: string;
  industry: string;
  headcount: string;
  year: string;
  url: string;
  pages: string;
  split: boolean;
}

const INITIAL_FORM: FormState = {
  name: "",
  industry: "",
  headcount: "",
  year: "2024",
  url: "",
  pages: "",
  split: false,
};

function googleSearchUrl(name: string, year: string): string {
  const query = `${name === "" ? "" : `${name} `}báo cáo phát triển bền vững ${year} filetype:pdf`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function AiDataTool() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiDataResult | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function pick(entry: CatalogEntry) {
    setForm((current) => ({
      ...current,
      name: entry.name,
      industry: entry.industry,
      headcount: entry.headcount,
      year: entry.year,
      url: entry.pdfUrl,
    }));
    setFileName("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    const body = new FormData();
    body.set("name", form.name);
    body.set("industry", form.industry);
    body.set("headcount", form.headcount);
    body.set("year", form.year);
    body.set("url", file ? "" : form.url);
    body.set("pages", form.pages);
    body.set("split", form.split ? "true" : "false");
    if (file) {
      body.set("file", file);
    }

    setStatus("running");
    setSteps([]);
    setError("");
    setResult(null);
    try {
      const data = await runAiData(body, (message) =>
        setSteps((current) => [...current, message]),
      );
      setResult(data);
      setStatus("done");
    } catch (caught) {
      setError(
        caught instanceof AiDataRunError ? caught.message : "Có lỗi không xác định.",
      );
      setStatus("error");
    }
  }

  function loadIntoSurvey() {
    if (!result) {
      return;
    }
    if (!saveDraft(result.content)) {
      setError("Không lưu được bản nháp vào trình duyệt.");
      return;
    }
    router.push("/");
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setSteps([]);
    setError("");
  }

  const running = status === "running";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Công cụ dữ liệu thử bằng AI</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Chỉ dùng nội bộ để thử báo cáo. AI 1 đọc báo cáo PDF của một doanh nghiệp và trả
          lời bộ câu hỏi. AI 2 kiểm tra từng câu với tài liệu gốc rồi điền vào khảo sát.
          Dữ liệu do AI điền được tô vàng.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-5 p-5">
          <div>
            <h2 className="text-base font-semibold">1. Chọn doanh nghiệp và báo cáo</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-subtle">Điền nhanh từ danh sách có sẵn:</span>
              {CATALOG.map((entry) => (
                <Button
                  key={entry.name}
                  size="sm"
                  variant="secondary"
                  disabled={running}
                  onClick={() => pick(entry)}
                >
                  {entry.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên doanh nghiệp" htmlFor="ai-name" required>
              <Input
                id="ai-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                disabled={running}
              />
            </Field>
            <Field label="Năm của báo cáo" htmlFor="ai-year" required>
              <Input
                id="ai-year"
                inputMode="numeric"
                maxLength={4}
                value={form.year}
                onChange={(event) => update("year", event.target.value)}
                disabled={running}
              />
            </Field>
            <Field label="Lĩnh vực hoạt động" htmlFor="ai-industry" required>
              <Select
                id="ai-industry"
                value={form.industry}
                options={industryOptions}
                placeholder="Chọn lĩnh vực"
                onChange={(event) => update("industry", event.target.value)}
                disabled={running}
              />
            </Field>
            <Field
              label="Quy mô nhân sự"
              htmlFor="ai-headcount"
              required
              hint="Quyết định số câu hỏi: dưới 50 người là mức Cơ bản, từ 50 người là mức Mở rộng."
            >
              <Select
                id="ai-headcount"
                value={form.headcount}
                options={headcountOptions}
                placeholder="Chọn quy mô"
                onChange={(event) => update("headcount", event.target.value)}
                disabled={running}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Đường dẫn tới tệp PDF báo cáo"
              htmlFor="ai-url"
              hint="Link phải mở ra thẳng tệp PDF, không phải trang web."
            >
              <Input
                id="ai-url"
                type="url"
                placeholder="https://.../bao-cao.pdf"
                value={form.url}
                onChange={(event) => update("url", event.target.value)}
                disabled={running}
              />
            </Field>
            <Field
              label="Hoặc chọn tệp PDF trên máy"
              htmlFor="ai-file"
              hint={fileName === "" ? "Dùng khi đã tải sẵn báo cáo về máy." : `Đã chọn: ${fileName}`}
            >
              <input
                id="ai-file"
                ref={fileRef}
                type="file"
                accept="application/pdf"
                disabled={running}
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
                className="block w-full text-sm file:mr-3 file:rounded-control file:border file:border-border-strong file:bg-surface file:px-3 file:py-2 file:text-sm"
              />
            </Field>
          </div>

          <div>
            <a
              href={googleSearchUrl(form.name, form.year)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 underline-offset-2 hover:underline"
            >
              <Search className="size-4" aria-hidden />
              Chưa có báo cáo? Mở Google để tìm tệp PDF
            </a>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-muted">Tùy chọn nâng cao</summary>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field
                label="Chỉ đọc các trang"
                htmlFor="ai-pages"
                hint="Ví dụ 60-160. Dùng khi báo cáo quá dài."
              >
                <Input
                  id="ai-pages"
                  placeholder="60-160"
                  value={form.pages}
                  onChange={(event) => update("pages", event.target.value)}
                  disabled={running}
                />
              </Field>
              <label className="flex items-start gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={form.split}
                  disabled={running}
                  onChange={(event) => update("split", event.target.checked)}
                  className="mt-0.5 size-4"
                />
                <span>
                  Chia nhỏ thành nhiều lượt hỏi
                  <span className="block text-xs text-subtle">
                    Dùng khi AI trả lời bị cắt. Chậm hơn và tốn nhiều lượt hơn.
                  </span>
                </span>
              </label>
            </div>
          </details>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={running}
              leadingIcon={running ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : undefined}
            >
              {running ? "Đang chạy..." : "Chạy AI"}
            </Button>
            <span className="text-xs text-subtle">
              Mỗi lần chạy mất khoảng 1 đến 3 phút. Đừng đóng trang khi đang chạy.
            </span>
          </div>
        </Card>
      </form>

      {steps.length > 0 ? (
        <Card className="p-5">
          <h2 className="text-base font-semibold">Tiến trình</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {steps.map((message, index) => {
              const last = index === steps.length - 1;
              return (
                <li key={`${index}-${message}`} className="flex items-start gap-2">
                  {last && running ? (
                    <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary-700" aria-hidden />
                  ) : (
                    <Check className="mt-0.5 size-4 shrink-0 text-primary-700" aria-hidden />
                  )}
                  <span>{message}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {status === "error" ? (
        <Card className="flex items-start gap-3 border-danger-600 p-5" role="alert">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-600" aria-hidden />
          <div>
            <h2 className="text-base font-semibold">Chưa chạy được</h2>
            <p className="mt-1 text-sm text-muted">{error}</p>
          </div>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <h2 className="text-base font-semibold">2. Kết quả</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <dt className="text-xs text-subtle">Câu AI đã điền</dt>
                <dd className="text-lg font-semibold">
                  {result.answers.length}/{result.totalQuestions}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Trường hồ sơ đã điền</dt>
                <dd className="text-lg font-semibold">{result.company.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Khớp với PDF</dt>
                <dd className="text-lg font-semibold">
                  {result.verifyOn ? `${result.verifiedCount}/${result.answers.length}` : "Chưa kiểm tra"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Tự chọn phủ định</dt>
                <dd className="text-lg font-semibold">{result.defaults.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Bị loại</dt>
                <dd className="text-lg font-semibold">{result.rejected.length}</dd>
              </div>
            </dl>
            <p className="rounded-control bg-yellow-100 px-3 py-2 text-sm">
              Dòng nền vàng là dữ liệu AI tìm thấy trong báo cáo, hãy đối chiếu với bản gốc. Câu AI
              không tìm thấy được tự chọn phủ định (Chưa có, Không, Chưa có số liệu), nên kết quả
              chỉ phản ánh những gì báo cáo công bố.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={loadIntoSurvey}>Nạp vào khảo sát và mở</Button>
              <Button variant="secondary" onClick={reset}>
                Chạy doanh nghiệp khác
              </Button>
              <span className="text-xs text-subtle">
                Bản nháp đang lưu trên trình duyệt này sẽ bị thay thế.
              </span>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <details open>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                Hồ sơ doanh nghiệp ({result.company.length})
              </summary>
              <ReviewTable rows={result.company} />
            </details>
          </Card>
          <Card className="overflow-hidden">
            <details open>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                Câu trả lời ({result.answers.length})
              </summary>
              <ReviewTable rows={result.answers} />
            </details>
          </Card>
          <Card className="overflow-hidden">
            <details>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                Tự chọn phủ định vì không tìm thấy ({result.defaults.length})
              </summary>
              <ReviewTable rows={result.defaults} tone="default" />
            </details>
          </Card>
          <Card className="overflow-hidden">
            <details>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                Bị loại, không đưa vào bản nháp ({result.rejected.length})
              </summary>
              <ul className="space-y-1 px-4 pb-4 text-sm text-muted">
                {result.rejected.length === 0 ? (
                  <li>Không có.</li>
                ) : (
                  result.rejected.map((item) => <li key={item}>{item}</li>)
                )}
              </ul>
            </details>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
