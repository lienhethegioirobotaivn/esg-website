import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_REPORT_THEME,
  EMPTY_PLAN,
  REPORT_ARCHIVE_LIMITS,
  buildReportSnapshot,
  countReportChunks,
  hasReportFileSignature,
  reportChunkFieldsSchema,
  reportFinishSchema,
  reportSnapshotSchema,
  resolveReportTheme,
  themeToInput,
} from "../src/index";

const UPLOAD_ID = "3b241101-e2bb-4255-8caf-4136c566a962";

function finishPayload(overrides: Record<string, unknown> = {}) {
  return {
    uploadId: UPLOAD_ID,
    reportCode: "ESG-20261117-AB12",
    locale: "vi",
    status: "complete",
    theme: "default",
    companyName: "Công ty ABC",
    snapshot: "{}",
    files: [
      { format: "pdf", name: "bao-cao.pdf", bytes: 5_000_000, chunks: 3 },
      { format: "docx", name: "bao-cao.docx", bytes: 1000, chunks: 1 },
    ],
    ...overrides,
  };
}

describe("report archive limits", () => {
  it("uses a chunk size that is a multiple of 3 so base64 parts join cleanly", () => {
    assert.equal(REPORT_ARCHIVE_LIMITS.chunkBytes % 3, 0);
  });

  it("counts chunks", () => {
    const size = REPORT_ARCHIVE_LIMITS.chunkBytes;
    assert.equal(countReportChunks(1), 1);
    assert.equal(countReportChunks(size), 1);
    assert.equal(countReportChunks(size + 1), 2);
    assert.equal(countReportChunks(size * 3), 3);
    assert.ok(countReportChunks(REPORT_ARCHIVE_LIMITS.maxFileBytes) <= REPORT_ARCHIVE_LIMITS.maxChunks);
  });

  it("checks file signatures", () => {
    assert.equal(hasReportFileSignature(Buffer.from("%PDF-1.7"), "pdf"), true);
    assert.equal(hasReportFileSignature(Buffer.from("%PDX-1.7"), "pdf"), false);
    assert.equal(hasReportFileSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1]), "docx"), true);
    assert.equal(hasReportFileSignature(Buffer.from("%PDF-1.7"), "docx"), false);
    assert.equal(hasReportFileSignature(new Uint8Array([0x25]), "pdf"), false);
  });
});

describe("report snapshot", () => {
  const answers = { "C-001": { value: "yes", number: "", description: "ghi chú" } };

  it("round trips a brand theme through the input schema", () => {
    const theme = resolveReportTheme({
      version: 1,
      font: "serif",
      colors: { primary: "#7A1F2B", accent: "#C0392B" },
      layout: { cover: "band", radius: "round", density: "airy" },
    });
    assert.equal(theme.isDefault, false);
    const input = themeToInput(theme);
    assert.notEqual(input, null);
    const back = resolveReportTheme(input);
    assert.deepEqual(back, theme);
  });

  it("stores no theme for the default look", () => {
    assert.equal(themeToInput(DEFAULT_REPORT_THEME), null);
  });

  it("builds a snapshot that passes its own schema and drops nothing the user typed", () => {
    const snapshot = buildReportSnapshot({
      company: { name: "ABC", sector: "MAN" },
      answers,
      plan: {
        tasks: [{ id: "t1", fromId: "", description: "Làm", owner: "A", due: "2026-12-01", status: "Đang thực hiện" }],
        goal: "Mục tiêu",
        resources: "",
        reviewCycle: "Quý",
      },
      theme: DEFAULT_REPORT_THEME,
      locale: "vi",
      savedAt: "2026-11-17T03:00:00.000Z",
    });
    const parsed = reportSnapshotSchema.safeParse(JSON.parse(JSON.stringify(snapshot)));
    assert.equal(parsed.success, true);
    assert.equal(snapshot.theme, null);
    assert.equal(snapshot.activeGroupId, null);
    assert.deepEqual(snapshot.answers, answers);
    assert.equal(snapshot.plan.tasks[0]?.owner, "A");
  });

  it("accepts an empty plan and a brand theme", () => {
    const theme = resolveReportTheme({ version: 1, colors: { primary: "#0B5D3B", accent: "#1B8F5A" } });
    const snapshot = buildReportSnapshot({
      company: {},
      answers: {},
      plan: EMPTY_PLAN,
      theme,
      locale: "zh",
      savedAt: "x",
    });
    assert.equal(reportSnapshotSchema.safeParse(JSON.parse(JSON.stringify(snapshot))).success, true);
  });

  it("rejects malformed snapshots", () => {
    const base = JSON.parse(
      JSON.stringify(
        buildReportSnapshot({
          company: {},
          answers,
          plan: EMPTY_PLAN,
          theme: DEFAULT_REPORT_THEME,
          locale: "vi",
          savedAt: "x",
        }),
      ),
    );
    assert.equal(reportSnapshotSchema.safeParse({ ...base, version: 2 }).success, false);
    assert.equal(reportSnapshotSchema.safeParse({ ...base, locale: "de" }).success, false);
    assert.equal(reportSnapshotSchema.safeParse({ ...base, answers: { a: { value: "", number: "", description: "" } } }).success, false);
    assert.equal(reportSnapshotSchema.safeParse({ ...base, plan: { ...base.plan, tasks: "x" } }).success, false);
  });
});

describe("upload schemas", () => {
  it("parses chunk fields coming from form data", () => {
    const parsed = reportChunkFieldsSchema.safeParse({ uploadId: UPLOAD_ID, format: "pdf", index: "0", total: "3" });
    assert.equal(parsed.success, true);
    assert.equal(reportChunkFieldsSchema.safeParse({ uploadId: "nope", format: "pdf", index: "0", total: "1" }).success, false);
    assert.equal(reportChunkFieldsSchema.safeParse({ uploadId: UPLOAD_ID, format: "exe", index: "0", total: "1" }).success, false);
    assert.equal(reportChunkFieldsSchema.safeParse({ uploadId: UPLOAD_ID, format: "pdf", index: "12", total: "13" }).success, false);
    assert.equal(reportChunkFieldsSchema.safeParse({ uploadId: UPLOAD_ID, format: "pdf", index: "-1", total: "1" }).success, false);
    assert.equal(reportChunkFieldsSchema.safeParse({ uploadId: UPLOAD_ID, format: "pdf", index: "0", total: "0" }).success, false);
  });

  it("accepts a consistent finish payload", () => {
    assert.equal(reportFinishSchema.safeParse(finishPayload()).success, true);
    assert.equal(
      reportFinishSchema.safeParse(
        finishPayload({ files: [{ format: "pdf", name: "a.pdf", bytes: 10, chunks: 1 }] }),
      ).success,
      true,
    );
  });

  it("rejects inconsistent finish payloads", () => {
    assert.equal(reportFinishSchema.safeParse(finishPayload({ reportCode: "ESG-1" })).success, false);
    assert.equal(reportFinishSchema.safeParse(finishPayload({ files: [] })).success, false);
    assert.equal(
      reportFinishSchema.safeParse(
        finishPayload({
          files: [
            { format: "pdf", name: "a.pdf", bytes: 10, chunks: 1 },
            { format: "pdf", name: "b.pdf", bytes: 10, chunks: 1 },
          ],
        }),
      ).success,
      false,
    );
    assert.equal(
      reportFinishSchema.safeParse(
        finishPayload({ files: [{ format: "pdf", name: "a.pdf", bytes: 5_000_000, chunks: 1 }] }),
      ).success,
      false,
    );
    assert.equal(
      reportFinishSchema.safeParse(
        finishPayload({ files: [{ format: "pdf", name: "a.pdf", bytes: REPORT_ARCHIVE_LIMITS.maxFileBytes + 1, chunks: 11 }] }),
      ).success,
      false,
    );
    assert.equal(reportFinishSchema.safeParse(finishPayload({ status: "x" })).success, false);
    assert.equal(
      reportFinishSchema.safeParse(finishPayload({ snapshot: "x".repeat(REPORT_ARCHIVE_LIMITS.maxSnapshotChars + 1) })).success,
      false,
    );
  });
});
