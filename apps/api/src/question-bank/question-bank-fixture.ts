import { fileURLToPath } from "node:url";

import { readerRequests } from "./parse-question-bank.js";
import { readWorkbookTables, type SheetTable, type WorkbookTables } from "./xlsx-tables.js";

export const QUESTION_BANK_XLSX = fileURLToPath(
  new URL("../../data/question-bank-v0.1.xlsx", import.meta.url),
);

export function loadFixtureTables(): Promise<WorkbookTables> {
  return readWorkbookTables(QUESTION_BANK_XLSX, readerRequests());
}

export function withCell(
  workbook: WorkbookTables,
  tabName: string,
  rowIndex: number,
  header: string,
  value: string,
): WorkbookTables {
  const table = workbook.tables.get(tabName);
  if (table === undefined) {
    throw new Error(`Thiếu tab ${tabName}`);
  }
  const rows = table.rows.map((row, index) =>
    index === rowIndex ? { ...row, cells: { ...row.cells, [header]: value } } : row,
  );
  const next: SheetTable = { ...table, rows };
  return { ...workbook, tables: new Map(workbook.tables).set(tabName, next) };
}

export function withoutTab(workbook: WorkbookTables, tabName: string): WorkbookTables {
  const tables = new Map(workbook.tables);
  tables.delete(tabName);
  return { ...workbook, tables, missingTabs: [...workbook.missingTabs, tabName] };
}
