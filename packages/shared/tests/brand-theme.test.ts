import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  brandPaletteSchema,
  brandSuggestionSchema,
  buildBrandTheme,
  mergePalettes,
  nearestPaletteColor,
  paletteFromPixels,
  themeFromPalette,
} from "../src/brand-theme";
import { resolveReportTheme } from "../src/report-theme";

type Pixel = readonly [number, number, number, number];

function image(parts: readonly (readonly [Pixel, number])[]): Uint8ClampedArray {
  const total = parts.reduce((sum, [, count]) => sum + count, 0);
  const data = new Uint8ClampedArray(total * 4);
  let offset = 0;
  for (const [pixel, count] of parts) {
    for (let index = 0; index < count; index += 1) {
      data.set(pixel, offset);
      offset += 4;
    }
  }
  return data;
}

const RED: Pixel = [192, 57, 43, 255];
const NAVY: Pixel = [16, 38, 66, 255];
const WHITE: Pixel = [255, 255, 255, 255];
const CLEAR: Pixel = [10, 200, 10, 0];

describe("paletteFromPixels", () => {
  it("returns the dominant colors ordered by share and ignores paper white", () => {
    const palette = paletteFromPixels(image([[RED, 600], [NAVY, 300], [WHITE, 5000]]));
    assert.equal(palette.length, 2);
    assert.equal(palette[0]?.hex, "#C0392B");
    assert.equal(palette[1]?.hex, "#102642");
    assert.ok(Math.abs((palette[0]?.share ?? 0) - 0.6667) < 0.001);
    assert.ok(Math.abs((palette[1]?.share ?? 0) - 0.3333) < 0.001);
  });

  it("ignores transparent pixels", () => {
    const palette = paletteFromPixels(image([[RED, 100], [CLEAR, 10000]]));
    assert.equal(palette.length, 1);
    assert.equal(palette[0]?.hex, "#C0392B");
  });

  it("merges close shades of the same color into one entry", () => {
    const palette = paletteFromPixels(
      image([[[192, 57, 43, 255], 400], [[200, 62, 48, 255], 300], [[185, 52, 40, 255], 300]]),
    );
    assert.equal(palette.length, 1);
  });

  it("returns an empty palette for a blank or white image", () => {
    assert.deepEqual(paletteFromPixels(image([[WHITE, 400]])), []);
    assert.deepEqual(paletteFromPixels(new Uint8ClampedArray(0)), []);
  });

  it("drops colors below one percent and respects the color limit", () => {
    const palette = paletteFromPixels(image([[RED, 990], [NAVY, 5]]));
    assert.equal(palette.length, 1);
    const many = paletteFromPixels(
      image([
        [[200, 30, 30, 255], 100],
        [[30, 200, 30, 255], 100],
        [[30, 30, 200, 255], 100],
        [[200, 200, 30, 255], 100],
      ]),
      2,
    );
    assert.equal(many.length, 2);
  });
});

describe("mergePalettes", () => {
  it("combines palettes from several images", () => {
    const first = paletteFromPixels(image([[RED, 100]]));
    const second = paletteFromPixels(image([[RED, 50], [NAVY, 50]]));
    const merged = mergePalettes([first, second]);
    assert.equal(merged[0]?.hex, "#C0392B");
    assert.equal(merged[1]?.hex, "#102642");
    assert.ok((merged[0]?.share ?? 0) > (merged[1]?.share ?? 0));
  });

  it("ignores empty palettes", () => {
    const merged = mergePalettes([[], paletteFromPixels(image([[NAVY, 100]]))]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.share, 1);
    assert.deepEqual(mergePalettes([[], []]), []);
  });
});

describe("buildBrandTheme", () => {
  const palette = [
    { hex: "#C0392B", share: 0.5 },
    { hex: "#102642", share: 0.3 },
    { hex: "#F2B705", share: 0.2 },
  ];
  const suggestion = brandSuggestionSchema.parse({
    primary: "#FF00FF",
    accent: "#00FFFF",
    font: "serif",
    cover: "band",
    tableHead: "underline",
    kpi: "outline",
    radius: "round",
    density: "airy",
  });

  it("snaps colors that are not in the extracted palette to the nearest palette color", () => {
    const theme = buildBrandTheme(suggestion, palette);
    const allowed = palette.map((color) => color.hex);
    assert.ok(allowed.includes(theme.colors.primary));
    assert.ok(allowed.includes(theme.colors.accent));
  });

  it("keeps the layout and font chosen by the suggestion", () => {
    const theme = buildBrandTheme(suggestion, palette);
    assert.equal(theme.font, "serif");
    assert.deepEqual({ ...theme.layout }, {
      cover: "band",
      tableHead: "underline",
      kpi: "outline",
      radius: "round",
      density: "airy",
    });
  });

  it("picks a different accent when primary and accent snap to the same color", () => {
    const same = brandSuggestionSchema.parse({ primary: "#C03A2B", accent: "#C23C2D" });
    const theme = buildBrandTheme(same, palette);
    assert.notEqual(theme.colors.primary, theme.colors.accent);
  });

  it("uses the suggestion as is when there is no palette", () => {
    const theme = buildBrandTheme(suggestion, []);
    assert.equal(theme.colors.primary, "#FF00FF");
    assert.equal(theme.colors.accent, "#00FFFF");
  });

  it("produces a theme that resolves to readable colors", () => {
    const theme = buildBrandTheme(suggestion, palette);
    const resolved = resolveReportTheme(theme);
    assert.equal(resolved.isDefault, false);
    assert.equal(resolved.font, "serif");
  });
});

describe("brandSuggestionSchema", () => {
  it("rejects a suggestion without valid colors", () => {
    assert.equal(brandSuggestionSchema.safeParse({}).success, false);
    assert.equal(
      brandSuggestionSchema.safeParse({ primary: "navy", accent: "#112233" }).success,
      false,
    );
  });

  it("falls back per field for unknown layout values and normalizes colors", () => {
    const parsed = brandSuggestionSchema.parse({
      primary: "7a1f2b",
      accent: "#c0392b",
      font: "comic",
      cover: "diagonal",
      kpi: "outline",
    });
    assert.equal(parsed.primary, "#7A1F2B");
    assert.equal(parsed.accent, "#C0392B");
    assert.equal(parsed.font, "sans");
    assert.equal(parsed.cover, "plain");
    assert.equal(parsed.kpi, "outline");
    assert.equal(parsed.density, "normal");
  });
});

describe("themeFromPalette", () => {
  it("returns null for an empty palette", () => {
    assert.equal(themeFromPalette([]), null);
  });

  it("prefers a dark colorful color as primary and a different color as accent", () => {
    const theme = themeFromPalette([
      { hex: "#F2B705", share: 0.5 },
      { hex: "#102642", share: 0.3 },
      { hex: "#C0392B", share: 0.2 },
    ]);
    assert.ok(theme !== null);
    assert.equal(theme.colors.primary, "#102642");
    assert.notEqual(theme.colors.accent, theme.colors.primary);
  });

  it("works for a monochrome brand", () => {
    const theme = themeFromPalette([{ hex: "#222222", share: 1 }]);
    assert.ok(theme !== null);
    assert.equal(theme.colors.primary, "#222222");
    assert.equal(theme.colors.accent, "#222222");
  });

  it("always yields a theme that resolves", () => {
    const theme = themeFromPalette([{ hex: "#F2B705", share: 1 }]);
    assert.equal(resolveReportTheme(theme).isDefault, false);
  });
});

describe("nearestPaletteColor and brandPaletteSchema", () => {
  it("finds the nearest color or null", () => {
    assert.equal(nearestPaletteColor("#FF0000", []), null);
    assert.equal(
      nearestPaletteColor("#FE0101", [
        { hex: "#0000FF", share: 0.5 },
        { hex: "#FF0000", share: 0.5 },
      ])?.hex,
      "#FF0000",
    );
  });

  it("validates and normalizes a palette", () => {
    const parsed = brandPaletteSchema.parse([{ hex: "c0392b", share: 0.4 }]);
    assert.equal(parsed[0]?.hex, "#C0392B");
    assert.equal(brandPaletteSchema.safeParse([{ hex: "bad", share: 0.4 }]).success, false);
    assert.equal(brandPaletteSchema.safeParse([{ hex: "#C0392B", share: 2 }]).success, false);
  });
});
