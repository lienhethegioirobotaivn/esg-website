import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildTableFile, neutralizeFormula } from "./table-export.js";

const columns = [
  { header: "Tên", value: (row: { name: string; note: string | null }) => row.name },
  { header: "Ghi chú", value: (row: { name: string; note: string | null }) => row.note },
];

describe("buildTableFile", () => {
  it("tạo CSV có BOM, escape dấu phẩy, nháy kép và xuống dòng", async () => {
    const file = await buildTableFile({
      format: "csv",
      baseName: "test",
      sheetName: "T",
      columns,
      rows: [{ name: 'Công ty "A", B', note: "dòng 1\ndòng 2" }, { name: "C", note: null }],
    });
    const text = file.buffer.toString("utf8");
    expect(text.startsWith("﻿Tên,Ghi chú\r\n")).toBe(true);
    expect(text).toContain('"Công ty ""A"", B","dòng 1\ndòng 2"');
    expect(text).toContain("\r\nC,\r\n");
    expect(file.contentType).toBe("text/csv; charset=utf-8");
    expect(file.fileName).toMatch(/^test-\d{8}\.csv$/);
  });

  it("vô hiệu hóa ô bắt đầu bằng ký tự công thức", async () => {
    expect(neutralizeFormula("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(neutralizeFormula("bình thường")).toBe("bình thường");
    const file = await buildTableFile({
      format: "csv",
      baseName: "t",
      sheetName: "T",
      columns,
      rows: [{ name: "+cmd", note: "@x" }],
    });
    expect(file.buffer.toString("utf8")).toContain("'+cmd,'@x");
  });

  it("tạo XLSX đọc lại được đúng nội dung", async () => {
    const file = await buildTableFile({
      format: "xlsx",
      baseName: "t",
      sheetName: "Khách hàng",
      columns,
      rows: [{ name: "Công ty A", note: "=1+1" }],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(file.buffer).buffer);
    const sheet = workbook.getWorksheet("Khách hàng");
    expect(sheet?.getRow(1).getCell(1).value).toBe("Tên");
    expect(sheet?.getRow(2).getCell(1).value).toBe("Công ty A");
    expect(sheet?.getRow(2).getCell(2).value).toBe("'=1+1");
  });
});
