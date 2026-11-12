import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { Locale } from "@/features/locale/constants";
import type { TFunction } from "@/features/locale/lib/translate";
import { interpolate } from "@/features/locale/lib/translate";

interface ReportText {
  t: TFunction;
  locale: Locale;
}

const identity: TFunction = (source, vars) => interpolate(source, vars);

const ReportTextContext = createContext<ReportText>({ t: identity, locale: "vi" });

export function ReportTextProvider({
  t,
  locale,
  children,
}: {
  t: TFunction;
  locale: Locale;
  children: ReactNode;
}) {
  return <ReportTextContext.Provider value={{ t, locale }}>{children}</ReportTextContext.Provider>;
}

export function useReportT(): TFunction {
  return useContext(ReportTextContext).t;
}

export function useReportLocale(): Locale {
  return useContext(ReportTextContext).locale;
}
