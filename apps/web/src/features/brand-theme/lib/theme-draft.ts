import {
  DEFAULT_REPORT_LAYOUT,
  DEFAULT_REPORT_THEME,
  resolveReportTheme,
} from "@esg/shared";
import type {
  BrandThemeResult,
  ReportFontKind,
  ReportTheme,
  ReportThemeInput,
  ReportThemeLayout,
} from "@esg/shared";

export interface BrandThemeDraft {
  readonly primary: string;
  readonly accent: string;
  readonly font: ReportFontKind;
  readonly layout: ReportThemeLayout;
}

export function draftFromTheme(theme: ReportTheme): BrandThemeDraft {
  return {
    primary: theme.colors.primary,
    accent: theme.colors.accent,
    font: theme.font,
    layout: { ...theme.layout },
  };
}

export function draftFromResult(theme: BrandThemeResult["theme"]): BrandThemeDraft {
  return {
    primary: theme.colors.primary,
    accent: theme.colors.accent,
    font: theme.font ?? "sans",
    layout: {
      cover: theme.layout?.cover ?? DEFAULT_REPORT_LAYOUT.cover,
      tableHead: theme.layout?.tableHead ?? DEFAULT_REPORT_LAYOUT.tableHead,
      kpi: theme.layout?.kpi ?? DEFAULT_REPORT_LAYOUT.kpi,
      radius: theme.layout?.radius ?? DEFAULT_REPORT_LAYOUT.radius,
      density: theme.layout?.density ?? DEFAULT_REPORT_LAYOUT.density,
    },
  };
}

export function inputFromDraft(draft: BrandThemeDraft): ReportThemeInput {
  return {
    version: 1,
    font: draft.font,
    colors: { primary: draft.primary, accent: draft.accent },
    layout: { ...draft.layout },
  };
}

export function isDefaultDraft(draft: BrandThemeDraft): boolean {
  const base = draftFromTheme(DEFAULT_REPORT_THEME);
  return (
    draft.primary.toUpperCase() === base.primary.toUpperCase() &&
    draft.accent.toUpperCase() === base.accent.toUpperCase() &&
    draft.font === base.font &&
    draft.layout.cover === base.layout.cover &&
    draft.layout.tableHead === base.layout.tableHead &&
    draft.layout.kpi === base.layout.kpi &&
    draft.layout.radius === base.layout.radius &&
    draft.layout.density === base.layout.density
  );
}

export function themeFromDraft(draft: BrandThemeDraft): ReportTheme {
  return isDefaultDraft(draft)
    ? DEFAULT_REPORT_THEME
    : resolveReportTheme(inputFromDraft(draft));
}
