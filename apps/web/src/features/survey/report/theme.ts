import { StyleSheet } from "@react-pdf/renderer";
import type { ReportTheme } from "@esg/shared";

import { REPORT_FONT_FAMILY } from "./fonts";

export const STATUS_PALETTE = {
  yes: "#1E8E5A",
  partial: "#E0A100",
  no: "#D64545",
  unknown: "#8A94A6",
  na: "#C5CCD8",
} as const;

export const PAGE = {
  paddingTop: 58,
  paddingBottom: 60,
  paddingHorizontal: 48,
} as const;

const RADIUS = { square: 0, soft: 4, round: 10 } as const;

const DENSITY = {
  compact: { space: 0.85, leading: -0.1 },
  normal: { space: 1, leading: 0 },
  airy: { space: 1.2, leading: 0.1 },
} as const;

export function createReportStyles(theme: ReportTheme) {
  const radius = RADIUS[theme.layout.radius];
  const density = DENSITY[theme.layout.density];
  const gap = (value: number) => Math.round(value * density.space * 100) / 100;
  const leading = (value: number) => Math.round((value + density.leading) * 100) / 100;
  const outlineKpi = theme.layout.kpi === "outline";
  const underlineHead = theme.layout.tableHead === "underline";

  const COLORS = {
    navy: theme.colors.primary,
    blue: theme.colors.accent,
    ink: theme.colors.ink,
    muted: theme.colors.muted,
    panel: theme.colors.panel,
    panelSoft: theme.colors.panelSoft,
    line: theme.colors.line,
    white: "#FFFFFF",
    ...STATUS_PALETTE,
    warnBg: "#FFF6DB",
    warnText: "#7A5A00",
  } as const;

  const styles = StyleSheet.create({
    page: {
      fontFamily: REPORT_FONT_FAMILY,
      fontSize: 9,
      color: COLORS.ink,
      paddingTop: PAGE.paddingTop,
      paddingBottom: PAGE.paddingBottom,
      paddingHorizontal: PAGE.paddingHorizontal,
    },
    header: {
      position: "absolute",
      top: 24,
      left: PAGE.paddingHorizontal,
      right: PAGE.paddingHorizontal,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 0.5,
      borderBottomColor: COLORS.line,
      paddingBottom: 6,
    },
    headerBrand: { fontSize: 7.5, fontWeight: 700, color: COLORS.navy, lineHeight: 1.3 },
    headerDraft: {
      fontSize: 7.5,
      fontWeight: 700,
      color: COLORS.warnText,
      backgroundColor: COLORS.warnBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      lineHeight: 1.3,
    },
    footer: {
      position: "absolute",
      bottom: 24,
      left: PAGE.paddingHorizontal,
      right: PAGE.paddingHorizontal,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 0.5,
      borderTopColor: COLORS.line,
      paddingTop: 6,
    },
    footerText: { fontSize: 7.5, color: COLORS.muted },
    kicker: {
      fontSize: 7.5,
      fontWeight: 700,
      color: COLORS.blue,
      letterSpacing: 0.6,
      lineHeight: 1.3,
      marginTop: 18,
    },
    h1: {
      fontSize: 16,
      fontWeight: 700,
      color: COLORS.navy,
      lineHeight: 1.3,
      marginTop: 3,
      marginBottom: 6,
    },
    h2: {
      fontSize: 11,
      fontWeight: 700,
      color: COLORS.navy,
      lineHeight: 1.3,
      marginTop: gap(12),
      marginBottom: 5,
    },
    h3: { fontSize: 9.5, fontWeight: 700, color: COLORS.navy, lineHeight: 1.35, marginBottom: 2 },
    answer: { fontSize: 9, fontWeight: 700, color: COLORS.blue, lineHeight: 1.4, marginBottom: 1 },
    intro: { fontSize: 9, color: COLORS.muted, lineHeight: leading(1.5), marginBottom: gap(10) },
    body: { fontSize: 9, lineHeight: leading(1.5) },
    note: { fontSize: 7.5, color: COLORS.muted, lineHeight: 1.45, marginTop: 6 },
    label: {
      fontSize: 7,
      fontWeight: 700,
      color: COLORS.muted,
      letterSpacing: 0.5,
      lineHeight: 1.3,
      marginBottom: 2,
    },
    value: { fontSize: 9.5, lineHeight: 1.45 },
    panel: {
      backgroundColor: COLORS.panel,
      borderRadius: radius,
      padding: gap(10),
      marginTop: gap(8),
    },
    panelSoft: {
      backgroundColor: COLORS.panelSoft,
      ...(radius > 0
        ? { borderWidth: 0.5, borderColor: COLORS.line, borderRadius: radius }
        : { borderLeftWidth: 2, borderLeftColor: COLORS.blue }),
      padding: gap(10),
      marginTop: gap(8),
    },
    kpiRow: { flexDirection: "row", marginTop: 8 },
    kpi: {
      flexGrow: 1,
      flexBasis: 0,
      backgroundColor: outlineKpi ? COLORS.white : COLORS.navy,
      ...(outlineKpi ? { borderWidth: 1, borderColor: COLORS.navy } : {}),
      borderRadius: radius,
      padding: gap(10),
      marginRight: 6,
    },
    kpiLabel: {
      fontSize: 7,
      color: outlineKpi ? COLORS.muted : "#B8C4DA",
      lineHeight: 1.3,
      marginBottom: 3,
    },
    kpiValue: {
      fontSize: 14,
      fontWeight: 700,
      color: outlineKpi ? COLORS.navy : COLORS.white,
      lineHeight: 1.25,
    },
    factsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
    fact: { width: "50%", paddingRight: 10, marginBottom: 8 },
    factFull: { width: "100%", paddingRight: 10, marginBottom: 8 },
    tableHead: {
      flexDirection: "row",
      ...(underlineHead
        ? { borderBottomWidth: 1.5, borderBottomColor: COLORS.navy }
        : { backgroundColor: COLORS.navy }),
      paddingVertical: gap(4),
      paddingHorizontal: 6,
    },
    tableHeadText: {
      fontSize: 7.5,
      fontWeight: 700,
      color: underlineHead ? COLORS.navy : COLORS.white,
      lineHeight: 1.3,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: COLORS.line,
      paddingVertical: gap(4),
      paddingHorizontal: 6,
    },
    tableCell: { fontSize: 8.5, lineHeight: leading(1.45) },
    cellMuted: { fontSize: 7.5, color: COLORS.muted, lineHeight: leading(1.45) },
  });

  return { COLORS, styles, radius };
}

export type ReportStyles = ReturnType<typeof createReportStyles>;
