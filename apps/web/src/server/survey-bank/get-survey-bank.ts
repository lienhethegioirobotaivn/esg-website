import "server-only";

import type { Survey } from "@esg/shared";

import { getServerEnv } from "../env";
import { fetchSheetTab } from "../google-sheets/fetch-sheet-tab";
import { buildSurveyBank } from "./build-survey-bank";
import {
  CONTENT_FIRST_HEADER,
  LOGIC_FIRST_HEADER,
  LOGIC_TAB_NAME,
  QUESTION_TABS,
} from "./constants";

export async function getSurveyBank(): Promise<Survey> {
  const env = getServerEnv();
  const spreadsheetId = env.GOOGLE_SHEET_QUESTIONS_ID;
  const revalidateSeconds = env.SURVEY_REVALIDATE_SECONDS;

  const [contents, logicTable] = await Promise.all([
    Promise.all(
      QUESTION_TABS.map(async (tab) => ({
        tab,
        table: await fetchSheetTab({
          spreadsheetId,
          tabName: tab.tabName,
          firstHeader: CONTENT_FIRST_HEADER,
          revalidateSeconds,
        }),
      })),
    ),
    fetchSheetTab({
      spreadsheetId,
      tabName: LOGIC_TAB_NAME,
      firstHeader: LOGIC_FIRST_HEADER,
      revalidateSeconds,
    }),
  ]);

  return buildSurveyBank(contents, logicTable);
}
