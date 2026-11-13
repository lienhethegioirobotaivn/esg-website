import { DEFAULT_REPORT_THEME } from "@esg/shared";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { createReportStyles } from "./theme";
import type { ReportStyles } from "./theme";

const ReportThemeContext = createContext<ReportStyles>(
  createReportStyles(DEFAULT_REPORT_THEME),
);

export function ReportThemeProvider({
  value,
  children,
}: {
  value: ReportStyles;
  children: ReactNode;
}) {
  return (
    <ReportThemeContext.Provider value={value}>{children}</ReportThemeContext.Provider>
  );
}

export function useReportTheme(): ReportStyles {
  return useContext(ReportThemeContext);
}
