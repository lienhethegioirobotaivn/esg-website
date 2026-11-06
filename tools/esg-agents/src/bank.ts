import type { Survey } from "@esg/shared";
import { z } from "zod";

import { parseCsv, toTable } from "../../../apps/web/src/server/google-sheets/parse-csv";
import type { SheetTable } from "../../../apps/web/src/server/google-sheets/parse-csv";
import { buildSurveyBank } from "../../../apps/web/src/server/survey-bank/build-survey-bank";
import {
  CONTENT_FIRST_HEADER,
  LOGIC_FIRST_HEADER,
  LOGIC_TAB_NAME,
  QUESTION_TABS,
} from "../../../apps/web/src/server/survey-bank/constants";

const sheetIdSchema = z.string().trim().min(1);

async function fetchTab(
  spreadsheetId: string,
  tabName: string,
  firstHeader: string,
): Promise<SheetTable> {
  const url =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}` +
    `/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(tabName)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Không đọc được tab "${tabName}" (HTTP ${response.status}). Kiểm tra quyền chia sẻ và tên tab.`,
    );
  }
  return toTable(parseCsv(await response.text()), firstHeader, tabName);
}

export async function loadSurveyBank(): Promise<Survey> {
  const parsedId = sheetIdSchema.safeParse(process.env["GOOGLE_SHEET_QUESTIONS_ID"]);
  if (!parsedId.success) {
    throw new Error("Thiếu GOOGLE_SHEET_QUESTIONS_ID trong tools/esg-agents/.env");
  }
  const spreadsheetId = parsedId.data;
  const [contents, logicTable] = await Promise.all([
    Promise.all(
      QUESTION_TABS.map(async (tab) => ({
        tab,
        table: await fetchTab(spreadsheetId, tab.tabName, CONTENT_FIRST_HEADER),
      })),
    ),
    fetchTab(spreadsheetId, LOGIC_TAB_NAME, LOGIC_FIRST_HEADER),
  ]);
  return buildSurveyBank(contents, logicTable);
}
