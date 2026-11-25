import ExcelJS from "exceljs";

export interface SheetRow {
  readonly rowNumber: number;
  readonly cells: Readonly<Record<string, string>>;
}

export interface SheetTable {
  readonly name: string;
  readonly headers: readonly string[];
  readonly rows: readonly SheetRow[];
}

const HEADER_SEARCH_LIMIT = 20;

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if ("richText" in value) {
    return value.richText
      .map((part) => part.text)
      .join("")
      .trim();
  }
  if ("result" in value) {
    return value.result === undefined || value.result instanceof Error
      ? ""
      : cellText(value.result as ExcelJS.CellValue);
  }
  if ("text" in value) {
    return cellText(value.text as ExcelJS.CellValue);
  }
  return "";
}

function readTable(sheet: ExcelJS.Worksheet, firstHeader: string): SheetTable | null {
  let headerRowNumber = 0;
  for (let index = 1; index <= Math.min(sheet.rowCount, HEADER_SEARCH_LIMIT); index += 1) {
    if (cellText(sheet.getRow(index).getCell(1).value) === firstHeader) {
      headerRowNumber = index;
      break;
    }
  }
  if (headerRowNumber === 0) {
    return null;
  }

  const headerRow = sheet.getRow(headerRowNumber);
  const headers: string[] = [];
  for (let column = 1; column <= sheet.columnCount; column += 1) {
    headers.push(cellText(headerRow.getCell(column).value));
  }

  const rows: SheetRow[] = [];
  for (let index = headerRowNumber + 1; index <= sheet.rowCount; index += 1) {
    const row = sheet.getRow(index);
    const cells: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, offset) => {
      if (header === "") {
        return;
      }
      const text = cellText(row.getCell(offset + 1).value);
      if (text !== "") {
        hasValue = true;
      }
      if (!(header in cells)) {
        cells[header] = text;
      }
    });
    if (hasValue) {
      rows.push({ rowNumber: index, cells });
    }
  }
  return { name: sheet.name, headers, rows };
}

export interface TableRequest {
  readonly tabName: string;
  readonly firstHeader: string;
}

export interface WorkbookTables {
  readonly tables: ReadonlyMap<string, SheetTable>;
  readonly missingTabs: readonly string[];
  readonly missingHeaders: readonly string[];
}

export async function readWorkbookTables(
  source: string | Buffer,
  requests: readonly TableRequest[],
): Promise<WorkbookTables> {
  const workbook = new ExcelJS.Workbook();
  if (typeof source === "string") {
    await workbook.xlsx.readFile(source);
  } else {
    await workbook.xlsx.load(source as unknown as ArrayBuffer);
  }

  const tables = new Map<string, SheetTable>();
  const missingTabs: string[] = [];
  const missingHeaders: string[] = [];
  for (const request of requests) {
    const sheet = workbook.getWorksheet(request.tabName);
    if (sheet === undefined) {
      missingTabs.push(request.tabName);
      continue;
    }
    const table = readTable(sheet, request.firstHeader);
    if (table === null) {
      missingHeaders.push(request.tabName);
      continue;
    }
    tables.set(request.tabName, table);
  }
  return { tables, missingTabs, missingHeaders };
}
