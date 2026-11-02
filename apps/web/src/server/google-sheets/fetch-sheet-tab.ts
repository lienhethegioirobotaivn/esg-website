import "server-only";

import { parseCsv, toTable } from "./parse-csv";
import type { SheetTable } from "./parse-csv";

interface FetchSheetTabInput {
  spreadsheetId: string;
  tabName: string;
  firstHeader: string;
  revalidateSeconds: number;
}

export async function fetchSheetTab({
  spreadsheetId,
  tabName,
  firstHeader,
  revalidateSeconds,
}: FetchSheetTabInput): Promise<SheetTable> {
  const url =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}` +
    `/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(tabName)}`;
  const response = await fetch(url, {
    next: { revalidate: revalidateSeconds },
  });
  if (!response.ok) {
    throw new Error(
      `Không đọc được tab "${tabName}" từ Google Sheet (HTTP ${response.status}). Kiểm tra quyền chia sẻ và tên tab.`,
    );
  }
  const text = await response.text();
  return toTable(parseCsv(text), firstHeader, tabName);
}
