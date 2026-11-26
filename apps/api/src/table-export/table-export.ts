import ExcelJS from "exceljs";

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface TableColumn<Row> {
  header: string;
  value(row: Row): string | number | boolean | Date | null | undefined;
}

export interface TableFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

const BYTE_ORDER_MARK = "\uFEFF";
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function neutralizeFormula(text: string): string {
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

function toText(value: string | number | boolean | Date | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function csvCell(text: string): string {
  const safe = neutralizeFormula(text);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export async function buildTableFile<Row>(input: {
  format: ExportFormat;
  baseName: string;
  sheetName: string;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
}): Promise<TableFile> {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const fileName = `${input.baseName}-${stamp}.${input.format}`;

  if (input.format === "csv") {
    const lines = [
      input.columns.map((column) => csvCell(column.header)).join(","),
      ...input.rows.map((row) =>
        input.columns.map((column) => csvCell(toText(column.value(row)))).join(","),
      ),
    ];
    return {
      buffer: Buffer.from(BYTE_ORDER_MARK + lines.join("\r\n") + "\r\n", "utf8"),
      contentType: "text/csv; charset=utf-8",
      fileName,
    };
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(input.sheetName);
  sheet.addRow(input.columns.map((column) => column.header)).font = { bold: true };
  for (const row of input.rows) {
    sheet.addRow(
      input.columns.map((column) => {
        const value = column.value(row);
        return typeof value === "string" ? neutralizeFormula(value) : toText(value);
      }),
    );
  }
  sheet.columns.forEach((column) => {
    column.width = 24;
  });
  const bytes = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(bytes),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName,
  };
}
