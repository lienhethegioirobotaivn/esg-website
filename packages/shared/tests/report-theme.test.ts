import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_REPORT_THEME,
  contrastRatio,
  resolveReportTheme,
} from "../src/report-theme";

const HEX = /^#[0-9A-F]{6}$/;

describe("resolveReportTheme", () => {
  it("returns the default theme for missing or invalid input", () => {
    assert.equal(resolveReportTheme(null), DEFAULT_REPORT_THEME);
    assert.equal(resolveReportTheme(undefined), DEFAULT_REPORT_THEME);
    assert.equal(resolveReportTheme({}), DEFAULT_REPORT_THEME);
    assert.equal(resolveReportTheme("#FF0000"), DEFAULT_REPORT_THEME);
    assert.equal(
      resolveReportTheme({ version: 1, colors: { primary: "red", accent: "#00FF00" } }),
      DEFAULT_REPORT_THEME,
    );
    assert.equal(
      resolveReportTheme({ version: 2, colors: { primary: "#112233", accent: "#445566" } }),
      DEFAULT_REPORT_THEME,
    );
  });

  it("keeps the default colors unchanged when they are given explicitly", () => {
    const theme = resolveReportTheme({
      version: 1,
      colors: DEFAULT_REPORT_THEME.colors,
    });
    assert.equal(theme, DEFAULT_REPORT_THEME);
    assert.equal(theme.isDefault, true);
  });

  it("normalizes case and a missing hash sign", () => {
    const theme = resolveReportTheme({
      version: 1,
      colors: { primary: "7a1f2b", accent: "#c0392b" },
    });
    assert.equal(theme.isDefault, false);
    assert.match(theme.colors.primary, HEX);
    assert.match(theme.colors.accent, HEX);
  });

  it("derives every missing color from primary and accent", () => {
    const theme = resolveReportTheme({
      version: 1,
      colors: { primary: "#7A1F2B", accent: "#C0392B" },
    });
    for (const value of Object.values(theme.colors)) {
      assert.match(value, HEX);
    }
    assert.equal(theme.colors.primary, "#7A1F2B");
  });

  it("guarantees readable contrast for derived colors", () => {
    const theme = resolveReportTheme({
      version: 1,
      colors: { primary: "#7A1F2B", accent: "#C0392B" },
    });
    const { colors } = theme;
    assert.ok(contrastRatio(colors.primary, "#FFFFFF") >= 4.5);
    assert.ok(contrastRatio(colors.accent, "#FFFFFF") >= 4.5);
    assert.ok(contrastRatio(colors.accent, colors.panel) >= 4.5);
    assert.ok(contrastRatio(colors.ink, "#FFFFFF") >= 7);
    assert.ok(contrastRatio(colors.muted, "#FFFFFF") >= 4.5);
    assert.ok(contrastRatio(colors.muted, colors.panel) >= 4.5);
  });

  it("darkens a light primary and accent until white text is readable", () => {
    const theme = resolveReportTheme({
      version: 1,
      colors: { primary: "#FFE000", accent: "#FFD54F" },
    });
    assert.notEqual(theme.colors.primary, "#FFE000");
    assert.ok(contrastRatio(theme.colors.primary, "#FFFFFF") >= 4.5);
    assert.ok(contrastRatio(theme.colors.accent, "#FFFFFF") >= 4.5);
  });

  it("replaces panel and line colors that are too dark", () => {
    const theme = resolveReportTheme({
      version: 1,
      colors: {
        primary: "#0B5D3B",
        accent: "#1B8F5A",
        panel: "#202020",
        panelSoft: "#303030",
        line: "#101010",
      },
    });
    assert.notEqual(theme.colors.panel, "#202020");
    assert.notEqual(theme.colors.panelSoft, "#303030");
    assert.notEqual(theme.colors.line, "#101010");
  });

  it("accepts light overrides for panel, panelSoft and line", () => {
    const theme = resolveReportTheme({
      version: 1,
      colors: {
        primary: "#0B5D3B",
        accent: "#1B8F5A",
        panel: "#EAF5EF",
        panelSoft: "#F3FAF6",
        line: "#CFE3D8",
      },
    });
    assert.equal(theme.colors.panel, "#EAF5EF");
    assert.equal(theme.colors.panelSoft, "#F3FAF6");
    assert.equal(theme.colors.line, "#CFE3D8");
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colors", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#FFFFFF")), 21);
    assert.equal(contrastRatio("#336699", "#336699"), 1);
  });

  it("is symmetric", () => {
    assert.equal(
      contrastRatio("#102642", "#F1F5FB"),
      contrastRatio("#F1F5FB", "#102642"),
    );
  });
});
