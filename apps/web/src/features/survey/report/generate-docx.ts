import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ChartDatum, ReportItem, ReportMetric, ReportModel } from "@esg/shared";

import type { Locale } from "@/features/locale/constants";
import type { TFunction } from "@/features/locale/lib/translate";

import { COPY } from "./copy";
import type { EvidenceImage } from "./pdf-parts";
import type { ReportLogo } from "./report-logo";

type Block = Paragraph | Table;

interface DocxInput {
  model: ReportModel;
  logo: ReportLogo | null;
  images: readonly EvidenceImage[];
  draftNotice: string | null;
  t: TFunction;
  locale: Locale;
}

interface Column {
  readonly title: string;
  readonly width: number;
}

interface Fact {
  readonly label: string;
  readonly value: string | null;
}

const FONT = "Arial";
const EAST_ASIA_FONT: Partial<Record<Locale, string>> = { zh: "Microsoft YaHei" };
const DOCUMENT_LANGUAGE: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
  fr: "fr-FR",
  zh: "zh-CN",
};
const INK = "101820";
const MUTED = "5B6677";
const GREEN = "102642";
const BLUE = "164CFF";
const SOFT = "F1F5FB";
const LINE = "DDE3EE";
const CONTENT_WIDTH = 9506;
const MAX_IMAGE_WIDTH = 440;

function metricText(metric: ReportMetric | null, t: TFunction): string | null {
  if (metric === null) {
    return null;
  }
  if (metric.state === "known") {
    return metric.unit === "" ? metric.text : `${metric.text} ${t(metric.unit)}`;
  }
  return metric.text;
}

function filled(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim() !== "";
}

function run(text: string, options: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    bold: options.bold,
    italics: options.italics,
    color: options.color ?? INK,
    size: options.size ?? 21,
  });
}

function body(text: string): Paragraph {
  return new Paragraph({ spacing: { after: 120, line: 300 }, children: [run(text)] });
}

function note(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 120, line: 280 },
    children: [run(text, { italics: true, color: MUTED, size: 18 })],
  });
}

function subHead(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
    children: [run(text, { bold: true, size: 23, color: GREEN })],
  });
}

function sectionHead(kicker: string, title: string, intro: string | undefined): Block[] {
  const blocks: Block[] = [
    new Paragraph({
      pageBreakBefore: true,
      spacing: { after: 40 },
      children: [run(kicker, { bold: true, color: MUTED, size: 17 })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [run(title, { bold: true, size: 36, color: GREEN })],
    }),
  ];
  if (filled(intro)) {
    blocks.push(body(intro));
  }
  return blocks;
}

function panel(label: string, text: string | null | undefined): Block[] {
  if (!filled(text)) {
    return [];
  }
  const side = { style: BorderStyle.SINGLE, size: 24, color: BLUE };
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: SOFT, color: "auto" },
              borders: { top: none, bottom: none, right: none, left: side },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [run(label.toUpperCase(), { bold: true, color: BLUE, size: 16 })],
                }),
                ...text.split("\n").map(
                  (line) =>
                    new Paragraph({ spacing: { line: 290, after: 40 }, children: [run(line)] }),
                ),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 140 }, children: [] }),
  ];
}

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

function dxa(percent: number): number {
  return Math.round((CONTENT_WIDTH * percent) / 100);
}

function cell(text: string, width: number, options: { head?: boolean; bold?: boolean; fill?: string } = {}): TableCell {
  return new TableCell({
    width: { size: dxa(width), type: WidthType.DXA },
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: options.head
      ? { type: ShadingType.CLEAR, fill: GREEN, color: "auto" }
      : options.fill
        ? { type: ShadingType.CLEAR, fill: options.fill, color: "auto" }
        : undefined,
    children: text.split("\n").map(
      (line) =>
        new Paragraph({
          spacing: { line: 270 },
          children: [
            run(line, {
              bold: options.head === true || options.bold === true,
              color: options.head ? "FFFFFF" : INK,
              size: 19,
            }),
          ],
        }),
    ),
  });
}

function dataTable(columns: readonly Column[], rows: readonly (readonly string[])[]): Block[] {
  if (rows.length === 0) {
    return [];
  }
  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: columns.map((column) => dxa(column.width)),
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          tableHeader: true,
          children: columns.map((column) => cell(column.title, column.width, { head: true })),
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              cantSplit: true,
              children: columns.map((column, index) => cell(row[index] ?? "", column.width)),
            }),
        ),
      ],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

function facts(items: readonly Fact[]): Block[] {
  const rows = items
    .filter((item): item is { label: string; value: string } => filled(item.value))
    .map((item) => [item.label, item.value]);
  if (rows.length === 0) {
    return [];
  }
  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [dxa(34), dxa(66)],
      layout: TableLayoutType.FIXED,
      rows: rows.map(
        (row) =>
          new TableRow({
            cantSplit: true,
            children: [cell(row[0] ?? "", 34, { bold: true, fill: SOFT }), cell(row[1] ?? "", 66)],
          }),
      ),
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

function kpis(items: readonly Fact[]): Block[] {
  const list = items.filter((item): item is { label: string; value: string } => filled(item.value));
  if (list.length === 0) {
    return [];
  }
  const width = Math.floor(CONTENT_WIDTH / list.length);
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return [
    new Table({
      width: { size: width * list.length, type: WidthType.DXA },
      columnWidths: list.map(() => width),
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: list.map(
            (item) =>
              new TableCell({
                width: { size: width, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: SOFT, color: "auto" },
                borders: { top: none, bottom: none, left: none, right: { style: BorderStyle.SINGLE, size: 24, color: "FFFFFF" } },
                margins: { top: 140, bottom: 140, left: 160, right: 160 },
                children: [
                  new Paragraph({ children: [run(item.value, { bold: true, color: GREEN, size: 36 })] }),
                  new Paragraph({ children: [run(item.label, { color: MUTED, size: 17 })] }),
                ],
              }),
          ),
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 140 }, children: [] }),
  ];
}

const CHART_SCALE = 2;
const CHART_WIDTH = 560;
const ROW_HEIGHT = 26;
const LABEL_WIDTH = 190;

function canvasSupported(): boolean {
  return typeof document !== "undefined";
}

function pngBytes(canvas: HTMLCanvasElement): Uint8Array {
  return dataUrlToBytes(canvas.toDataURL("image/png"));
}

function chartBlock(title: string, canvas: HTMLCanvasElement, width: number, height: number): Block[] {
  return [
    new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [run(title, { bold: true, color: GREEN, size: 21 })],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new ImageRun({ type: "png", data: pngBytes(canvas), transformation: { width, height } }),
      ],
    }),
  ];
}

function newCanvas(rows: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; height: number } | null {
  if (!canvasSupported()) {
    return null;
  }
  const height = rows * ROW_HEIGHT + 12;
  const canvas = document.createElement("canvas");
  canvas.width = CHART_WIDTH * CHART_SCALE;
  canvas.height = height * CHART_SCALE;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.scale(CHART_SCALE, CHART_SCALE);
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, CHART_WIDTH, height);
  context.font = "12px Arial, sans-serif";
  context.textBaseline = "middle";
  return { canvas, context, height };
}

function barChart(title: string, data: readonly ChartDatum[], unit: string): Block[] {
  const rows = data.filter((datum) => datum.value > 0);
  const surface = rows.length === 0 ? null : newCanvas(rows.length);
  if (!surface) {
    return [];
  }
  const { canvas, context, height } = surface;
  const max = Math.max(...rows.map((datum) => datum.value));
  const track = CHART_WIDTH - LABEL_WIDTH - 90;
  rows.forEach((datum, index) => {
    const y = 6 + index * ROW_HEIGHT + ROW_HEIGHT / 2;
    context.fillStyle = `#${INK}`;
    context.textAlign = "left";
    context.fillText(datum.label.length > 28 ? `${datum.label.slice(0, 27)}…` : datum.label, 0, y);
    const length = Math.max(2, (datum.value / max) * track);
    context.fillStyle = `#${BLUE}`;
    context.fillRect(LABEL_WIDTH, y - 8, length, 16);
    context.fillStyle = `#${MUTED}`;
    context.fillText(`${datum.value}${unit === "" ? "" : ` ${unit}`}`, LABEL_WIDTH + length + 6, y);
  });
  return chartBlock(title, canvas, CHART_WIDTH * 0.75, height * 0.75);
}

function statusColors(t: TFunction): Record<string, string> {
  return {
    [t("Có")]: "#1E8E5A",
    [t("Có một phần")]: "#E0A100",
    [t("Chưa có")]: "#D64545",
    [t("Chưa rõ")]: "#8A94A6",
    [t("Không áp dụng")]: "#C5CCD8",
  };
}

function practiceChart(data: readonly ChartDatum[], t: TFunction): Block[] {
  const colors = statusColors(t);
  const rows = data.filter((datum) => datum.value > 0);
  const surface = rows.length === 0 ? null : newCanvas(rows.length);
  if (!surface) {
    return [];
  }
  const { canvas, context, height } = surface;
  const max = Math.max(...rows.map((datum) => datum.value));
  const track = CHART_WIDTH - LABEL_WIDTH - 60;
  rows.forEach((datum, index) => {
    const y = 6 + index * ROW_HEIGHT + ROW_HEIGHT / 2;
    context.fillStyle = `#${INK}`;
    context.textAlign = "left";
    context.fillText(datum.label, 0, y);
    const length = Math.max(2, (datum.value / max) * track);
    context.fillStyle = colors[datum.label] ?? `#${BLUE}`;
    context.fillRect(LABEL_WIDTH, y - 8, length, 16);
    context.fillStyle = `#${MUTED}`;
    context.fillText(String(datum.value), LABEL_WIDTH + length + 6, y);
  });
  return chartBlock(t("Phân bố trạng thái thực hành"), canvas, CHART_WIDTH * 0.75, height * 0.75);
}

function pillarChart(
  data: readonly { label: string; yes: number; partial: number; gap: number }[],
  t: TFunction,
): Block[] {
  const surface = data.length === 0 ? null : newCanvas(data.length);
  if (!surface) {
    return [];
  }
  const { canvas, context, height } = surface;
  const track = CHART_WIDTH - LABEL_WIDTH - 20;
  data.forEach((row, index) => {
    const y = 6 + index * ROW_HEIGHT + ROW_HEIGHT / 2;
    const total = row.yes + row.partial + row.gap;
    context.fillStyle = `#${INK}`;
    context.textAlign = "left";
    context.fillText(row.label, 0, y);
    let x = LABEL_WIDTH;
    for (const [value, color] of [
      [row.yes, "#1E8E5A"],
      [row.partial, "#E0A100"],
      [row.gap, "#D64545"],
    ] as const) {
      const length = total === 0 ? 0 : (value / total) * track;
      context.fillStyle = color;
      context.fillRect(x, y - 8, length, 16);
      x += length;
    }
  });
  return chartBlock(
    t("Mức độ khai báo theo trụ cột (xanh: có, vàng: một phần, đỏ: còn thiếu)"),
    canvas,
    CHART_WIDTH * 0.75,
    height * 0.75,
  );
}

function questionItems(items: readonly (ReportItem | null)[], t: TFunction): Block[] {
  const list = items.filter((item): item is ReportItem => item !== null);
  return dataTable(
    [
      { title: t("Mã"), width: 10 },
      { title: t("Nội dung"), width: 38 },
      { title: t("Câu trả lời"), width: 32 },
      { title: t("Căn cứ"), width: 20 },
    ],
    list.map((item) => [item.id, item.label, item.answer, item.evidence]),
  );
}

function assessment(text: string | null | undefined, t: TFunction): Block[] {
  return panel(t("Nhận định theo hồ sơ"), text);
}

function section(
  kicker: string,
  title: string,
  intro: string | undefined,
  content: readonly Block[],
): Block[] {
  if (content.length === 0) {
    return [];
  }
  return [...sectionHead(kicker, title, intro), ...content];
}

function dataUrlToBytes(src: string): Uint8Array {
  const base64 = src.slice(src.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => resolve({ width: 4, height: 3 });
    image.src = src;
  });
}

function scaled(
  size: { width: number; height: number },
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / size.width, maxHeight / size.height, 1);
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  };
}

function reportYear(period: string): string | null {
  const match = period.match(/(\d{4})\D*$/);
  return match?.[1] ?? null;
}

function cover(model: ReportModel, logo: ReportLogo | null, t: TFunction): Block[] {
  const { meta } = model;
  const year = reportYear(meta.period);
  const blocks: Block[] = [];
  if (logo) {
    const size = scaled(logo, 160, 56);
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            type: "png",
            data: dataUrlToBytes(logo.src),
            transformation: size,
          }),
        ],
      }),
    );
  }
  blocks.push(
    new Paragraph({
      spacing: { before: logo ? 1800 : 2600, after: 120 },
      children: [run(t("HỒ SƠ DOANH NGHIỆP"), { bold: true, color: MUTED, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [run(t("BÁO CÁO ESG"), { bold: true, color: GREEN, size: 80 })],
    }),
  );
  if (year) {
    blocks.push(
      new Paragraph({ spacing: { after: 400 }, children: [run(year, { color: MUTED, size: 56 })] }),
    );
  }
  blocks.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [run(meta.companyName, { bold: true, size: 36 })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [run(t("Môi trường • Xã hội • Quản trị"), { color: MUTED })],
    }),
    new Paragraph({
      spacing: { after: 600 },
      children: [run(t("Kỳ báo cáo {period}", { period: meta.period }), { color: MUTED })],
    }),
  );
  if (meta.isDraft) {
    blocks.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [run(t("BẢN NHÁP"), { bold: true, color: "B45309", size: 32 })],
      }),
    );
  }
  blocks.push(
    new Paragraph({
      spacing: { before: 600, after: 60 },
      children: [run(t(COPY.coverTagline))],
    }),
    note(t(COPY.coverNote)),
    new Paragraph({
      spacing: { before: 200 },
      children: [run("ESG REPORT ONLINE", { bold: true, size: 18 })],
    }),
  );
  return blocks;
}

async function evidenceImages(
  model: ReportModel,
  images: readonly EvidenceImage[],
  t: TFunction,
): Promise<Block[]> {
  const codes = new Set(images.map((image) => image.code));
  const groups = model.evidence.groups.filter((group) =>
    group.files.some((file) => codes.has(file.code)),
  );
  if (groups.length === 0) {
    return [];
  }
  const blocks: Block[] = [];
  for (const group of groups) {
    blocks.push(
      new Paragraph({
        spacing: { before: 240, after: 40 },
        children: [run(t("{id} • CÂU HỎI CÓ MINH CHỨNG", { id: group.questionId }), { bold: true, color: MUTED, size: 17 })],
      }),
      subHead(group.label),
      body(group.text),
      note(
        group.note !== null
          ? t("Ghi chú của doanh nghiệp: {note}", { note: group.note })
          : t(COPY.evidenceNoNote),
      ),
    );
    for (const file of group.files) {
      const image = images.find((entry) => entry.code === file.code);
      if (!image) {
        continue;
      }
      const size = scaled(await imageSize(image.src), MAX_IMAGE_WIDTH, 300);
      blocks.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [
            new ImageRun({ type: "jpg", data: dataUrlToBytes(image.src), transformation: size }),
          ],
        }),
        note(t("{code} • Tệp: {fileName}", { code: image.code, fileName: image.fileName })),
      );
    }
    const others = group.files.filter((file) => !codes.has(file.code));
    if (others.length > 0) {
      blocks.push(
        note(
          `${t(COPY.evidenceOtherFiles)} ${others.map((file) => `${file.code} (${file.name})`).join("; ")}`,
        ),
      );
    }
  }
  blocks.push(note(t(COPY.imagesNote)));
  return blocks;
}

export async function generateReportDocx(input: DocxInput): Promise<Blob> {
  const { model, logo, images, draftNotice, t, locale } = input;
  const practiceChartT = (data: readonly ChartDatum[]) => practiceChart(data, t);
  const pillarChartT = (data: Parameters<typeof pillarChart>[0]) => pillarChart(data, t);
  const questionItemsT = (items: readonly (ReportItem | null)[]) => questionItems(items, t);
  const assessmentT = (text: string | null | undefined) => assessment(text, t);
  const metricTextT = (metric: ReportMetric | null) => metricText(metric, t);
  const { meta, summary, profile, environment, social, governance, improvement, evidence, appendix, confirmation, charts } = model;
  const moduleIntros: Record<string, string> = COPY.moduleIntros;
  const translatedIntro = (source: string): string | undefined => {
    const intro = moduleIntros[source];
    return intro === undefined ? undefined : t(intro);
  };
  const brand = meta.tradingName ?? meta.companyName;

  const practiceRows = (
    [
      [t("Có"), summary.practice.yes],
      [t("Có một phần"), summary.practice.partial],
      [t("Chưa có"), summary.practice.no],
      [t("Chưa rõ"), summary.practice.unknown],
      [t("Không áp dụng"), summary.practice.na],
      [t("Chưa trả lời"), summary.practice.unanswered],
    ] as const
  ).map(([label, count]) => [label, String(count)]);

  const children: Block[] = [
    ...cover(model, logo, t),

    ...section(t("GIỚI THIỆU"), t("Về báo cáo này"), t(COPY.aboutIntro), [
      ...panel(t(COPY.basisTitle), t(COPY.basisBody)),
      ...panel(t(COPY.layersTitle), t(COPY.layersBody)),
      ...dataTable(
        [
          { title: t("Trạng thái"), width: 34 },
          { title: t("Ý nghĩa"), width: 66 },
        ],
        COPY.statusLegend.map((row) => [t(row[0]), t(row[1])]),
      ),
      note(t(COPY.aboutNote)),
    ]),

    ...section(t("TỔNG QUAN TRONG KỲ"), t("Tóm tắt điều hành"), t(COPY.summaryIntro), [
      ...(filled(draftNotice) ? panel(t("Bản nháp"), draftNotice) : []),
      ...kpis([
        { label: t("Khai báo hợp lệ"), value: String(summary.answeredCount) },
        { label: t("Tài liệu đã đính kèm"), value: String(summary.evidenceCount) },
        { label: t("Nội dung cần bổ sung"), value: String(summary.openItemsCount) },
      ]),
      body(summary.executiveSummary),
      ...(canvasSupported()
        ? [...practiceChartT(charts.practiceStatus), ...pillarChartT(charts.pillarStatus)]
        : [
            subHead(t("Phân bố trạng thái thực hành")),
            ...dataTable(
              [
                { title: t("Trạng thái"), width: 60 },
                { title: t("Số câu"), width: 40 },
              ],
              practiceRows,
            ),
          ]),
      ...(summary.priorities.length > 0
        ? [
            subHead(t("Ưu tiên được ghi nhận")),
            ...dataTable(
              [
                { title: t("STT"), width: 10 },
                { title: t("Nội dung"), width: 90 },
              ],
              summary.priorities.map((priority, index) => [String(index + 1), priority]),
            ),
            note(t(COPY.prioritiesNote)),
          ]
        : []),
      note(t(COPY.summaryNote)),
    ]),

    ...section(t("R01 / NHẬN DIỆN"), t("Hồ sơ doanh nghiệp"), t(COPY.profileIntro), [
      ...facts([
        { label: t("Tên pháp lý"), value: meta.companyName },
        { label: t("Tên giao dịch"), value: meta.tradingName },
        { label: t("Mã số doanh nghiệp"), value: meta.registrationId },
        { label: t("Loại hình pháp lý"), value: meta.legalForm },
        { label: t("Ngành chính"), value: profile.primarySector },
        { label: t("Ngành bổ sung"), value: profile.secondarySectors },
        { label: t("Nhóm quy mô nhân sự"), value: profile.sizeBand },
        { label: t("Hoạt động chính"), value: profile.activities },
      ]),
      ...panel(t("Nhận định theo hồ sơ"), profile.orgContext),
    ]),

    ...section(t("R01 / CƠ SỞ LẬP HỒ SƠ"), t("Phạm vi và ranh giới dữ liệu"), t(COPY.scopeIntro), [
      ...facts([
        { label: t("Kỳ báo cáo"), value: meta.period },
        { label: t("Hoạt động đặc thù"), value: profile.capabilities },
        { label: t("Quốc gia, vùng hoạt động"), value: meta.countries },
        { label: t("Có người lao động trong kỳ"), value: profile.employeesPresence },
        { label: t("Nhà thầu và lao động thuê ngoài"), value: profile.contractorPresence },
      ]),
      ...(profile.sites.length > 0 ? [subHead(t("Danh mục cơ sở"))] : []),
      ...dataTable(
        [
          { title: t("Cơ sở"), width: 34 },
          { title: t("Hoạt động được tính"), width: 33 },
          { title: t("Giới hạn"), width: 33 },
        ],
        profile.sites.map((site) => [site.name, site.scope, site.limit]),
      ),
      ...panel(t("Giới hạn phạm vi"), profile.scopeLimitations),
      note(t(COPY.scopeNote)),
    ]),

    ...section(t("R01 / BỐI CẢNH KINH DOANH"), t("Hoạt động và chuỗi giá trị"), t(COPY.valueChainIntro), [
      ...facts([
        { label: t("Sản phẩm, dịch vụ chính"), value: profile.products },
        { label: t("Nhóm nhà cung cấp quan trọng"), value: profile.supplierGroupsText },
        { label: t("Thị trường và nhóm khách hàng"), value: profile.markets },
        { label: t("Nhóm đối tác đầu ra"), value: profile.downstreamGroupsText },
        { label: t("Khoảng doanh thu tự nguyện"), value: profile.revenueBand },
      ]),
      ...panel(t("Nhận định theo hồ sơ"), profile.valueChainContext),
    ]),

    ...section(t("R02 / MÔI TRƯỜNG"), t("Tổng quan môi trường"), t(COPY.envIntro), [
      ...kpis([
        { label: t("Điện sử dụng"), value: metricTextT(environment.electricity) },
        { label: t("Nước sử dụng"), value: metricTextT(environment.water) },
        { label: t("Dữ liệu phát thải"), value: environment.ghgStatus },
      ]),
      ...panel(t("Nhận định theo hồ sơ"), environment.overviewAssessment),
      ...panel(t("Những nội dung cần làm rõ"), environment.overviewGaps),
    ]),

    ...section(t("R02 / NĂNG LƯỢNG"), t("Năng lượng và sử dụng hiệu quả"), t(COPY.energyIntro), [
      ...facts([
        { label: t("Điện tiêu thụ trong kỳ"), value: metricTextT(environment.electricity) },
        { label: t("Nguồn, cách tổng hợp"), value: environment.electricity?.source ?? null },
        { label: t("Nhiên liệu"), value: metricTextT(environment.fuel) },
        { label: t("Nguồn nhiên liệu"), value: environment.fuel?.source ?? null },
      ]),
      ...questionItemsT(environment.energy.items),
      ...assessmentT(environment.energy.assessment),
    ]),

    ...section(t("R02 / PHẦN KHAI BÁO MỞ RỘNG"), t("Khí nhà kính và rủi ro khí hậu"), t(COPY.ghgIntro), [
      ...dataTable(
        [
          { title: t("Chỉ số"), width: 34 },
          { title: t("Giá trị"), width: 33 },
          { title: t("Phạm vi"), width: 33 },
        ],
        [
          environment.scope1
            ? ["Scope 1", metricTextT(environment.scope1) ?? "", environment.scope1.source]
            : null,
          environment.scope2
            ? ["Scope 2 location-based", metricTextT(environment.scope2) ?? "", environment.scope2.source]
            : null,
        ].filter((row): row is string[] => row !== null),
      ),
      ...facts([
        { label: t("Phương pháp và ranh giới"), value: environment.ghgMethod },
        { label: t("Nguồn tính, hệ số được sử dụng"), value: environment.ghgSources },
      ]),
      ...assessmentT(environment.climate.assessment),
      ...barChart(t("Phát thải trong phạm vi"), charts.ghg, "tCO₂e"),
      ...questionItemsT(environment.climate.items),
      note(t(COPY.ghgNote)),
    ]),

    ...section(t("R02 / TÀI NGUYÊN NƯỚC"), t("Nước và nước thải"), t(COPY.waterIntro), [
      ...facts([
        { label: t("Nước sử dụng"), value: metricTextT(environment.water) },
        { label: t("Phạm vi và nguồn số liệu"), value: environment.water?.source ?? null },
        { label: t("Cách thu gom, xử lý nước thải"), value: metricTextT(environment.wastewater) },
      ]),
      ...assessmentT(environment.waterSection.assessment),
      ...questionItemsT(environment.waterSection.items),
    ]),

    ...section(t("R02 / CHẤT THẢI"), t("Chất thải và quản lý dòng thải"), t(COPY.wasteIntro), [
      ...facts([
        { label: t("Không nguy hại"), value: metricTextT(environment.wasteNonHazardous) },
        { label: t("Nguy hại"), value: metricTextT(environment.wasteHazardous) },
        { label: t("Nguồn số liệu không nguy hại"), value: environment.wasteNonHazardous?.source ?? null },
        { label: t("Nguồn số liệu nguy hại"), value: environment.wasteHazardous?.source ?? null },
      ]),
      ...barChart(t("Chất thải"), charts.waste, t("tấn")),
      ...questionItemsT(environment.waste.items),
      ...assessmentT(environment.waste.assessment),
    ]),

    ...section(t("R02 / CÁC TÁC ĐỘNG LIÊN QUAN"), t("Vật liệu và tác động tại cơ sở"), t(COPY.materialsIntro), [
      ...questionItemsT(environment.materials.items),
      ...(environment.materials.items.length > 0 ? assessmentT(environment.materials.assessment) : []),
    ]),

    ...section(t("R02 / THEO DÕI VÀ CẢI THIỆN"), t("Sự cố và mục tiêu môi trường"), t(COPY.incidentIntro), [
      ...questionItemsT([environment.incident]),
      ...(environment.targets.items.length > 0 ? [subHead(t("Mục tiêu môi trường"))] : []),
      ...questionItemsT(environment.targets.items),
      ...assessmentT(environment.targets.assessment),
    ]),

    ...section(t("R03 / NGƯỜI LAO ĐỘNG VÀ XÃ HỘI"), t("Con người và điều kiện làm việc"), t(COPY.workforceIntro), [
      ...kpis([{ label: t("Người lao động cuối kỳ"), value: metricTextT(social.headcount) }]),
      ...facts([
        { label: t("Phạm vi người lao động"), value: social.workerScope },
        { label: t("Cơ cấu lao động"), value: metricTextT(social.workforceTable) },
      ]),
      ...questionItemsT(social.workforce.items),
      ...assessmentT(social.workforce.assessment),
    ]),

    ...section(t("R03 / MÔI TRƯỜNG LÀM VIỆC"), t("An toàn và sức khỏe nghề nghiệp"), t(COPY.safetyIntro), [
      ...kpis([
        { label: t("Tai nạn lao động trong kỳ"), value: metricTextT(social.accidents) },
        { label: t("Tử vong liên quan công việc"), value: metricTextT(social.fatalities) },
      ]),
      ...questionItemsT(social.safety.items),
      ...assessmentT(social.safety.assessment),
    ]),

    ...section(t("R03 / ĐỐI XỬ CÓ TRÁCH NHIỆM"), t("Quyền lao động và đối thoại"), t(COPY.labourIntro), [
      ...questionItemsT(social.labour.items),
      ...assessmentT(social.labour.assessment),
      ...(social.labour.items.length > 0 || filled(social.labour.assessment)
        ? [note(t(COPY.labourNote))]
        : []),
    ]),

    ...section(t("R03 / ĐÀO TẠO VÀ QUAN HỆ XÃ HỘI"), t("Năng lực và quan hệ với các bên"), t(COPY.communityIntro), [
      ...facts([
        { label: t("Tổng thời lượng đào tạo"), value: metricTextT(social.trainingHours) },
        { label: t("Nguồn tổng hợp"), value: social.trainingHours?.source ?? null },
      ]),
      ...assessmentT(social.community.assessment),
      ...questionItemsT(social.community.items),
    ]),

    ...section(t("R04 / QUẢN TRỊ"), t("Trách nhiệm và điều phối ESG"), t(COPY.governanceIntro), [
      ...facts([
        { label: t("Vai trò điều phối ESG"), value: governance.esgRole },
        { label: t("Cơ chế xem xét của lãnh đạo"), value: governance.leadershipReview },
      ]),
      ...assessmentT(governance.coordination.assessment),
      ...questionItemsT(governance.coordination.items),
      ...facts([
        { label: t("Các vấn đề được doanh nghiệp lựa chọn ưu tiên"), value: governance.priorities },
      ]),
    ]),

    ...section(t("R04 / ĐẠO ĐỨC VÀ MINH BẠCH"), t("Liêm chính và cơ chế phản ánh"), t(COPY.integrityIntro), [
      ...questionItemsT(governance.integrity.items),
      ...questionItemsT([governance.integrityIncident]),
      ...assessmentT(governance.integrity.assessment),
      ...(governance.integrity.items.length > 0 || governance.integrityIncident !== null
        ? [note(t(COPY.integrityNote))]
        : []),
    ]),

    ...section(t("R04 / QUAN HỆ KINH DOANH"), t("Mua sắm và chuỗi cung ứng"), t(COPY.supplyIntro), [
      ...facts([{ label: t("Phạm vi theo dõi"), value: profile.supplierGroupsText }]),
      ...assessmentT(governance.supply.assessment),
      ...questionItemsT(governance.supply.items),
      ...dataTable(
        [
          { title: t("Nhóm nhà cung cấp"), width: 34 },
          { title: t("Tiêu chí, rủi ro được nêu"), width: 33 },
          { title: t("Cách xử lý được khai"), width: 33 },
        ],
        profile.supplierGroups.map((group) => [group.name, group.risk, group.response]),
      ),
      ...(governance.supply.items.length > 0 || profile.supplierGroups.length > 0
        ? [note(t(COPY.supplyNote))]
        : []),
    ]),

    ...section(t("R04 / KIỂM SOÁT VÀ TÍNH LIÊN TỤC"), t("Dữ liệu và chất lượng thông tin"), t(COPY.dataIntro), [
      ...questionItemsT(governance.data.items),
      ...assessmentT(governance.data.assessment),
      ...(governance.data.items.length > 0 ? [note(t(COPY.dataNote))] : []),
    ]),

    ...model.modules.flatMap((module) =>
      section(t("R05 / NỘI DUNG THEO NGÀNH"), module.title, translatedIntro(module.source), [
        ...facts([
          { label: t("Ngành, hoạt động được áp dụng"), value: module.scope },
          { label: t("Cơ sở và giới hạn"), value: module.limits },
        ]),
        ...questionItemsT(module.items),
        subHead(t("Nhận định theo hoạt động")),
        body(module.assessment ?? t("Chưa có đủ nội dung khai báo để nhận định.")),
        note(t(COPY.moduleNote)),
      ]),
    ),

    ...section(t("R06 / TỪ DỮ LIỆU ĐẾN HÀNH ĐỘNG"), t("Khoảng trống và ưu tiên cải thiện"), t(COPY.gapsIntro), [
      ...dataTable(
        [
          { title: t("Vấn đề"), width: 24 },
          { title: t("Căn cứ"), width: 56 },
          { title: t("Gợi ý ưu tiên"), width: 20 },
        ],
        improvement.gaps.map((gap) => [gap.title, gap.reason, gap.priority]),
      ),
      ...barChart(t("Khoảng trống theo chủ đề"), charts.gapsByTopic, ""),
      ...panel(t("Trọng tâm cho kỳ tiếp theo"), improvement.focus),
      ...panel(t("Những việc cần xác minh thêm"), improvement.followups),
      ...(improvement.gaps.length > 0 ? [note(t(COPY.gapsNote))] : []),
    ]),

    ...section(t("R06 / LỘ TRÌNH CẢI THIỆN"),
      t("Kế hoạch hành động"),
      t(COPY.actionsIntro),
      improvement.actions.length > 0 ||
        filled(improvement.goal) ||
        filled(improvement.resources) ||
        filled(improvement.reviewCycle) ||
        improvement.suggestions.length > 0
        ? [
            ...(improvement.actions.length > 0
              ? [
                  ...dataTable(
                    [
                      { title: t("Công việc"), width: 46 },
                      { title: t("Phụ trách"), width: 16 },
                      { title: t("Thời hạn"), width: 16 },
                      { title: t("Trạng thái"), width: 22 },
                    ],
                    improvement.actions.map((action) => [
                      action.description,
                      action.owner,
                      action.due,
                      t(action.status),
                    ]),
                  ),
                  ...facts([
                    { label: t("Kết quả mong muốn"), value: improvement.goal },
                    { label: t("Nguồn lực"), value: improvement.resources },
                    { label: t("Chu kỳ xem xét"), value: improvement.reviewCycle },
                  ]),
                  note(t(COPY.actionsNote)),
                ]
              : [note(t(COPY.actionsNoPlan))]),
            ...(improvement.suggestions.length > 0
              ? [
                  subHead(t(COPY.actionsSuggestTitle)),
                  ...dataTable(
                    [
                      { title: t("Công việc và căn cứ"), width: 74 },
                      { title: t("Gợi ý ưu tiên"), width: 26 },
                    ],
                    improvement.suggestions.map((suggestion) => [
                      `${suggestion.text} (${suggestion.basis})`,
                      suggestion.priority,
                    ]),
                  ),
                  note(t(COPY.actionsSuggestNote)),
                ]
              : []),
          ]
        : [],
    ),

    ...section(t("R07 / CĂN CỨ TRỰC QUAN"),
      t("Hình ảnh và minh chứng chọn lọc"),
      t(COPY.imagesIntro),
      await evidenceImages(model, images, t),
    ),

    ...section(t("R07 / TRUY XUẤT THÔNG TIN"), t("Danh mục căn cứ và giới hạn"), t(COPY.evidenceIntro), [
      ...dataTable(
        [
          { title: t("Mã căn cứ"), width: 14 },
          { title: t("Nội dung, câu liên quan"), width: 46 },
          { title: t("Kỳ, phạm vi"), width: 22 },
          { title: t("Tình trạng"), width: 18 },
        ],
        evidence.rows.map((row) => [row.id, row.description, row.scope, row.status]),
      ),
      ...panel(t("Giới hạn dữ liệu"), evidence.limitations),
      ...panel(t("Tình trạng xác minh"), evidence.verificationStatement),
      ...panel(t("Tham chiếu công bố được phép"), evidence.permittedReferences),
      note(t(COPY.evidenceNote)),
    ]),

    ...section(t("R07 / CHI TIẾT HỒ SƠ"), t("Phụ lục câu trả lời"), t(COPY.appendixIntro), [
      ...dataTable(
        [
          { title: t("Mã câu"), width: 11 },
          { title: t("Câu hỏi"), width: 39 },
          { title: t("Câu trả lời"), width: 28 },
          { title: t("Trạng thái căn cứ"), width: 22 },
        ],
        appendix.rows.map((row) => [row.id, row.question, row.answer, row.evidence]),
      ),
      ...panel(t("Nội dung chưa khai báo trong phạm vi"), appendix.unansweredSummary),
      note(t(COPY.appendixNote)),
    ]),

    ...sectionHead(t("R07 / KIỂM SOÁT PHIÊN BẢN"), t("Xác nhận và thông tin phát hành"), t(COPY.confirmIntro)),
    ...facts([
      { label: t("Đơn vị báo cáo"), value: meta.companyName },
      { label: t("Ngày phát hành"), value: meta.issuedAt },
      { label: t("Vai trò người xác nhận"), value: confirmation.role },
      { label: t("Mã hồ sơ / phiên bản"), value: `${meta.reportId} / ${meta.reportVersion}` },
      { label: t("Thời điểm xác nhận"), value: confirmation.confirmedAt },
      { label: t("Bộ câu hỏi / dữ liệu"), value: `${meta.contentVersion} / ${meta.answerVersion}` },
      { label: t("Trạng thái xác nhận"), value: confirmation.status },
    ]),
    subHead(t("Kênh truy xuất hồ sơ")),
    body(meta.reportReference),
    note(t(COPY.confirmNote)),
    new Paragraph({
      spacing: { before: 400 },
      children: [run("ESG REPORT ONLINE", { bold: true, color: GREEN, size: 28 })],
    }),
    body(t(COPY.closing)),
  ];

  const document = new Document({
    creator: "ESG Report Online",
    title: t("Báo cáo ESG {name}", { name: meta.companyName }),
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: FONT, hAnsi: FONT, cs: FONT, eastAsia: EAST_ASIA_FONT[locale] ?? FONT },
            size: 21,
            language: {
              value: DOCUMENT_LANGUAGE[locale],
              ...(locale === "zh" ? { eastAsia: DOCUMENT_LANGUAGE[locale] } : {}),
            },
          },
        },
      },
    },
    sections: [
      {
        properties: { page: { margin: { top: 1300, bottom: 1200, left: 1200, right: 1200 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  run(brand, { bold: true, color: MUTED, size: 16 }),
                  run(meta.isDraft ? `    ${t("BẢN NHÁP")}` : "", { bold: true, color: "B45309", size: 16 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  run(`${meta.status} • ${meta.reportId}    `, { color: MUTED, size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}
