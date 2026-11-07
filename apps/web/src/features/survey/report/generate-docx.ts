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

import { COPY } from "./copy";
import type { EvidenceImage } from "./pdf-parts";
import type { ReportLogo } from "./report-logo";

type Block = Paragraph | Table;

interface DocxInput {
  model: ReportModel;
  logo: ReportLogo | null;
  images: readonly EvidenceImage[];
  draftNotice: string | null;
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
const INK = "101820";
const MUTED = "5B6677";
const GREEN = "102642";
const BLUE = "164CFF";
const SOFT = "F1F5FB";
const LINE = "DDE3EE";
const CONTENT_WIDTH = 9506;
const MAX_IMAGE_WIDTH = 440;

function metricText(metric: ReportMetric | null): string | null {
  if (metric === null) {
    return null;
  }
  if (metric.state === "known") {
    return metric.unit === "" ? metric.text : `${metric.text} ${metric.unit}`;
  }
  return metric.text;
}

function filled(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim() !== "";
}

function run(text: string, options: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
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

const STATUS_COLORS: Record<string, string> = {
  "Có": "#1E8E5A",
  "Có một phần": "#E0A100",
  "Chưa có": "#D64545",
  "Chưa rõ": "#8A94A6",
  "Không áp dụng": "#C5CCD8",
};

function practiceChart(data: readonly ChartDatum[]): Block[] {
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
    context.fillStyle = STATUS_COLORS[datum.label] ?? `#${BLUE}`;
    context.fillRect(LABEL_WIDTH, y - 8, length, 16);
    context.fillStyle = `#${MUTED}`;
    context.fillText(String(datum.value), LABEL_WIDTH + length + 6, y);
  });
  return chartBlock("Phân bố trạng thái thực hành", canvas, CHART_WIDTH * 0.75, height * 0.75);
}

function pillarChart(
  data: readonly { label: string; yes: number; partial: number; gap: number }[],
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
    "Mức độ khai báo theo trụ cột (xanh: có, vàng: một phần, đỏ: còn thiếu)",
    canvas,
    CHART_WIDTH * 0.75,
    height * 0.75,
  );
}

function questionItems(items: readonly (ReportItem | null)[]): Block[] {
  const list = items.filter((item): item is ReportItem => item !== null);
  return dataTable(
    [
      { title: "Mã", width: 10 },
      { title: "Nội dung", width: 38 },
      { title: "Câu trả lời", width: 32 },
      { title: "Căn cứ", width: 20 },
    ],
    list.map((item) => [item.id, item.label, item.answer, item.evidence]),
  );
}

function assessment(text: string | null | undefined): Block[] {
  return panel("Nhận định theo hồ sơ", text);
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

function cover(model: ReportModel, logo: ReportLogo | null): Block[] {
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
      children: [run("HỒ SƠ DOANH NGHIỆP", { bold: true, color: MUTED, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [run("BÁO CÁO ESG", { bold: true, color: GREEN, size: 80 })],
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
      children: [run("Môi trường • Xã hội • Quản trị", { color: MUTED })],
    }),
    new Paragraph({
      spacing: { after: 600 },
      children: [run(`Kỳ báo cáo ${meta.period}`, { color: MUTED })],
    }),
  );
  if (meta.isDraft) {
    blocks.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [run("BẢN NHÁP", { bold: true, color: "B45309", size: 32 })],
      }),
    );
  }
  blocks.push(
    new Paragraph({
      spacing: { before: 600, after: 60 },
      children: [run(COPY.coverTagline)],
    }),
    note(COPY.coverNote),
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
        children: [run(`${group.questionId} • CÂU HỎI CÓ MINH CHỨNG`, { bold: true, color: MUTED, size: 17 })],
      }),
      subHead(group.label),
      body(group.text),
      note(
        group.note !== null
          ? `Ghi chú của doanh nghiệp: ${group.note}`
          : COPY.evidenceNoNote,
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
        note(`${image.code} • Tệp: ${image.fileName}`),
      );
    }
    const others = group.files.filter((file) => !codes.has(file.code));
    if (others.length > 0) {
      blocks.push(
        note(
          `${COPY.evidenceOtherFiles} ${others.map((file) => `${file.code} (${file.name})`).join("; ")}`,
        ),
      );
    }
  }
  blocks.push(note(COPY.imagesNote));
  return blocks;
}

export async function generateReportDocx(input: DocxInput): Promise<Blob> {
  const { model, logo, images, draftNotice } = input;
  const { meta, summary, profile, environment, social, governance, improvement, evidence, appendix, confirmation, charts } = model;
  const moduleIntros: Record<string, string> = COPY.moduleIntros;
  const brand = meta.tradingName ?? meta.companyName;

  const practiceRows = (
    [
      ["Có", summary.practice.yes],
      ["Có một phần", summary.practice.partial],
      ["Chưa có", summary.practice.no],
      ["Chưa rõ", summary.practice.unknown],
      ["Không áp dụng", summary.practice.na],
      ["Chưa trả lời", summary.practice.unanswered],
    ] as const
  ).map(([label, count]) => [label, String(count)]);

  const children: Block[] = [
    ...cover(model, logo),

    ...section("GIỚI THIỆU", "Về báo cáo này", COPY.aboutIntro, [
      ...panel(COPY.basisTitle, COPY.basisBody),
      ...panel(COPY.layersTitle, COPY.layersBody),
      ...dataTable(
        [
          { title: "Trạng thái", width: 34 },
          { title: "Ý nghĩa", width: 66 },
        ],
        COPY.statusLegend.map((row) => [row[0], row[1]]),
      ),
      note(COPY.aboutNote),
    ]),

    ...section("TỔNG QUAN TRONG KỲ", "Tóm tắt điều hành", COPY.summaryIntro, [
      ...(filled(draftNotice) ? panel("Bản nháp", draftNotice) : []),
      ...kpis([
        { label: "Khai báo hợp lệ", value: String(summary.answeredCount) },
        { label: "Tài liệu đã đính kèm", value: String(summary.evidenceCount) },
        { label: "Nội dung cần bổ sung", value: String(summary.openItemsCount) },
      ]),
      body(summary.executiveSummary),
      ...(canvasSupported()
        ? [...practiceChart(charts.practiceStatus), ...pillarChart(charts.pillarStatus)]
        : [
            subHead("Phân bố trạng thái thực hành"),
            ...dataTable(
              [
                { title: "Trạng thái", width: 60 },
                { title: "Số câu", width: 40 },
              ],
              practiceRows,
            ),
          ]),
      ...(summary.priorities.length > 0
        ? [
            subHead("Ưu tiên được ghi nhận"),
            ...dataTable(
              [
                { title: "STT", width: 10 },
                { title: "Nội dung", width: 90 },
              ],
              summary.priorities.map((priority, index) => [String(index + 1), priority]),
            ),
            note(COPY.prioritiesNote),
          ]
        : []),
      note(COPY.summaryNote),
    ]),

    ...section("R01 / NHẬN DIỆN", "Hồ sơ doanh nghiệp", COPY.profileIntro, [
      ...facts([
        { label: "Tên pháp lý", value: meta.companyName },
        { label: "Tên giao dịch", value: meta.tradingName },
        { label: "Mã số doanh nghiệp", value: meta.registrationId },
        { label: "Loại hình pháp lý", value: meta.legalForm },
        { label: "Ngành chính", value: profile.primarySector },
        { label: "Ngành bổ sung", value: profile.secondarySectors },
        { label: "Nhóm quy mô nhân sự", value: profile.sizeBand },
        { label: "Hoạt động chính", value: profile.activities },
      ]),
      ...panel("Nhận định theo hồ sơ", profile.orgContext),
    ]),

    ...section("R01 / CƠ SỞ LẬP HỒ SƠ", "Phạm vi và ranh giới dữ liệu", COPY.scopeIntro, [
      ...facts([
        { label: "Kỳ báo cáo", value: meta.period },
        { label: "Hoạt động đặc thù", value: profile.capabilities },
        { label: "Quốc gia, vùng hoạt động", value: meta.countries },
        { label: "Có người lao động trong kỳ", value: profile.employeesPresence },
        { label: "Nhà thầu và lao động thuê ngoài", value: profile.contractorPresence },
      ]),
      ...(profile.sites.length > 0 ? [subHead("Danh mục cơ sở")] : []),
      ...dataTable(
        [
          { title: "Cơ sở", width: 34 },
          { title: "Hoạt động được tính", width: 33 },
          { title: "Giới hạn", width: 33 },
        ],
        profile.sites.map((site) => [site.name, site.scope, site.limit]),
      ),
      ...panel("Giới hạn phạm vi", profile.scopeLimitations),
      note(COPY.scopeNote),
    ]),

    ...section("R01 / BỐI CẢNH KINH DOANH", "Hoạt động và chuỗi giá trị", COPY.valueChainIntro, [
      ...facts([
        { label: "Sản phẩm, dịch vụ chính", value: profile.products },
        { label: "Nhóm nhà cung cấp quan trọng", value: profile.supplierGroupsText },
        { label: "Thị trường và nhóm khách hàng", value: profile.markets },
        { label: "Nhóm đối tác đầu ra", value: profile.downstreamGroupsText },
        { label: "Khoảng doanh thu tự nguyện", value: profile.revenueBand },
      ]),
      ...panel("Nhận định theo hồ sơ", profile.valueChainContext),
    ]),

    ...section("R02 / MÔI TRƯỜNG", "Tổng quan môi trường", COPY.envIntro, [
      ...kpis([
        { label: "Điện sử dụng", value: metricText(environment.electricity) },
        { label: "Nước sử dụng", value: metricText(environment.water) },
        { label: "Dữ liệu phát thải", value: environment.ghgStatus },
      ]),
      ...panel("Nhận định theo hồ sơ", environment.overviewAssessment),
      ...panel("Những nội dung cần làm rõ", environment.overviewGaps),
    ]),

    ...section("R02 / NĂNG LƯỢNG", "Năng lượng và sử dụng hiệu quả", COPY.energyIntro, [
      ...facts([
        { label: "Điện tiêu thụ trong kỳ", value: metricText(environment.electricity) },
        { label: "Nguồn, cách tổng hợp", value: environment.electricity?.source ?? null },
        { label: "Nhiên liệu", value: metricText(environment.fuel) },
        { label: "Nguồn nhiên liệu", value: environment.fuel?.source ?? null },
      ]),
      ...questionItems(environment.energy.items),
      ...assessment(environment.energy.assessment),
    ]),

    ...section("R02 / PHẦN KHAI BÁO MỞ RỘNG", "Khí nhà kính và rủi ro khí hậu", COPY.ghgIntro, [
      ...dataTable(
        [
          { title: "Chỉ số", width: 34 },
          { title: "Giá trị", width: 33 },
          { title: "Phạm vi", width: 33 },
        ],
        [
          environment.scope1
            ? ["Scope 1", metricText(environment.scope1) ?? "", environment.scope1.source]
            : null,
          environment.scope2
            ? ["Scope 2 location-based", metricText(environment.scope2) ?? "", environment.scope2.source]
            : null,
        ].filter((row): row is string[] => row !== null),
      ),
      ...facts([
        { label: "Phương pháp và ranh giới", value: environment.ghgMethod },
        { label: "Nguồn tính, hệ số được sử dụng", value: environment.ghgSources },
      ]),
      ...assessment(environment.climate.assessment),
      ...barChart("Phát thải trong phạm vi", charts.ghg, "tCO₂e"),
      ...questionItems(environment.climate.items),
      note(COPY.ghgNote),
    ]),

    ...section("R02 / TÀI NGUYÊN NƯỚC", "Nước và nước thải", COPY.waterIntro, [
      ...facts([
        { label: "Nước sử dụng", value: metricText(environment.water) },
        { label: "Phạm vi và nguồn số liệu", value: environment.water?.source ?? null },
        { label: "Cách thu gom, xử lý nước thải", value: metricText(environment.wastewater) },
      ]),
      ...assessment(environment.waterSection.assessment),
      ...questionItems(environment.waterSection.items),
    ]),

    ...section("R02 / CHẤT THẢI", "Chất thải và quản lý dòng thải", COPY.wasteIntro, [
      ...facts([
        { label: "Không nguy hại", value: metricText(environment.wasteNonHazardous) },
        { label: "Nguy hại", value: metricText(environment.wasteHazardous) },
        { label: "Nguồn số liệu không nguy hại", value: environment.wasteNonHazardous?.source ?? null },
        { label: "Nguồn số liệu nguy hại", value: environment.wasteHazardous?.source ?? null },
      ]),
      ...barChart("Chất thải", charts.waste, "tấn"),
      ...questionItems(environment.waste.items),
      ...assessment(environment.waste.assessment),
    ]),

    ...section("R02 / CÁC TÁC ĐỘNG LIÊN QUAN", "Vật liệu và tác động tại cơ sở", COPY.materialsIntro, [
      ...questionItems(environment.materials.items),
      ...(environment.materials.items.length > 0 ? assessment(environment.materials.assessment) : []),
    ]),

    ...section("R02 / THEO DÕI VÀ CẢI THIỆN", "Sự cố và mục tiêu môi trường", COPY.incidentIntro, [
      ...questionItems([environment.incident]),
      ...(environment.targets.items.length > 0 ? [subHead("Mục tiêu môi trường")] : []),
      ...questionItems(environment.targets.items),
      ...assessment(environment.targets.assessment),
    ]),

    ...section("R03 / NGƯỜI LAO ĐỘNG VÀ XÃ HỘI", "Con người và điều kiện làm việc", COPY.workforceIntro, [
      ...kpis([{ label: "Người lao động cuối kỳ", value: metricText(social.headcount) }]),
      ...facts([
        { label: "Phạm vi người lao động", value: social.workerScope },
        { label: "Cơ cấu lao động", value: metricText(social.workforceTable) },
      ]),
      ...questionItems(social.workforce.items),
      ...assessment(social.workforce.assessment),
    ]),

    ...section("R03 / MÔI TRƯỜNG LÀM VIỆC", "An toàn và sức khỏe nghề nghiệp", COPY.safetyIntro, [
      ...kpis([
        { label: "Tai nạn lao động trong kỳ", value: metricText(social.accidents) },
        { label: "Tử vong liên quan công việc", value: metricText(social.fatalities) },
      ]),
      ...questionItems(social.safety.items),
      ...assessment(social.safety.assessment),
    ]),

    ...section("R03 / ĐỐI XỬ CÓ TRÁCH NHIỆM", "Quyền lao động và đối thoại", COPY.labourIntro, [
      ...questionItems(social.labour.items),
      ...assessment(social.labour.assessment),
      ...(social.labour.items.length > 0 || filled(social.labour.assessment)
        ? [note(COPY.labourNote)]
        : []),
    ]),

    ...section("R03 / ĐÀO TẠO VÀ QUAN HỆ XÃ HỘI", "Năng lực và quan hệ với các bên", COPY.communityIntro, [
      ...facts([
        { label: "Tổng thời lượng đào tạo", value: metricText(social.trainingHours) },
        { label: "Nguồn tổng hợp", value: social.trainingHours?.source ?? null },
      ]),
      ...assessment(social.community.assessment),
      ...questionItems(social.community.items),
    ]),

    ...section("R04 / QUẢN TRỊ", "Trách nhiệm và điều phối ESG", COPY.governanceIntro, [
      ...facts([
        { label: "Vai trò điều phối ESG", value: governance.esgRole },
        { label: "Cơ chế xem xét của lãnh đạo", value: governance.leadershipReview },
      ]),
      ...assessment(governance.coordination.assessment),
      ...questionItems(governance.coordination.items),
      ...facts([
        { label: "Các vấn đề được doanh nghiệp lựa chọn ưu tiên", value: governance.priorities },
      ]),
    ]),

    ...section("R04 / ĐẠO ĐỨC VÀ MINH BẠCH", "Liêm chính và cơ chế phản ánh", COPY.integrityIntro, [
      ...questionItems(governance.integrity.items),
      ...questionItems([governance.integrityIncident]),
      ...assessment(governance.integrity.assessment),
      ...(governance.integrity.items.length > 0 || governance.integrityIncident !== null
        ? [note(COPY.integrityNote)]
        : []),
    ]),

    ...section("R04 / QUAN HỆ KINH DOANH", "Mua sắm và chuỗi cung ứng", COPY.supplyIntro, [
      ...facts([{ label: "Phạm vi theo dõi", value: profile.supplierGroupsText }]),
      ...assessment(governance.supply.assessment),
      ...questionItems(governance.supply.items),
      ...dataTable(
        [
          { title: "Nhóm nhà cung cấp", width: 34 },
          { title: "Tiêu chí, rủi ro được nêu", width: 33 },
          { title: "Cách xử lý được khai", width: 33 },
        ],
        profile.supplierGroups.map((group) => [group.name, group.risk, group.response]),
      ),
      ...(governance.supply.items.length > 0 || profile.supplierGroups.length > 0
        ? [note(COPY.supplyNote)]
        : []),
    ]),

    ...section("R04 / KIỂM SOÁT VÀ TÍNH LIÊN TỤC", "Dữ liệu và chất lượng thông tin", COPY.dataIntro, [
      ...questionItems(governance.data.items),
      ...assessment(governance.data.assessment),
      ...(governance.data.items.length > 0 ? [note(COPY.dataNote)] : []),
    ]),

    ...model.modules.flatMap((module) =>
      section("R05 / NỘI DUNG THEO NGÀNH", module.title, moduleIntros[module.source], [
        ...facts([
          { label: "Ngành, hoạt động được áp dụng", value: module.scope },
          { label: "Cơ sở và giới hạn", value: module.limits },
        ]),
        ...questionItems(module.items),
        subHead("Nhận định theo hoạt động"),
        body(module.assessment ?? "Chưa có đủ nội dung khai báo để nhận định."),
        note(COPY.moduleNote),
      ]),
    ),

    ...section("R06 / TỪ DỮ LIỆU ĐẾN HÀNH ĐỘNG", "Khoảng trống và ưu tiên cải thiện", COPY.gapsIntro, [
      ...dataTable(
        [
          { title: "Vấn đề", width: 24 },
          { title: "Căn cứ", width: 56 },
          { title: "Gợi ý ưu tiên", width: 20 },
        ],
        improvement.gaps.map((gap) => [gap.title, gap.reason, gap.priority]),
      ),
      ...barChart("Khoảng trống theo chủ đề", charts.gapsByTopic, ""),
      ...panel("Trọng tâm cho kỳ tiếp theo", improvement.focus),
      ...panel("Những việc cần xác minh thêm", improvement.followups),
      ...(improvement.gaps.length > 0 ? [note(COPY.gapsNote)] : []),
    ]),

    ...section(
      "R06 / LỘ TRÌNH CẢI THIỆN",
      "Kế hoạch hành động",
      COPY.actionsIntro,
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
                      { title: "Công việc", width: 46 },
                      { title: "Phụ trách", width: 16 },
                      { title: "Thời hạn", width: 16 },
                      { title: "Trạng thái", width: 22 },
                    ],
                    improvement.actions.map((action) => [
                      action.description,
                      action.owner,
                      action.due,
                      action.status,
                    ]),
                  ),
                  ...facts([
                    { label: "Kết quả mong muốn", value: improvement.goal },
                    { label: "Nguồn lực", value: improvement.resources },
                    { label: "Chu kỳ xem xét", value: improvement.reviewCycle },
                  ]),
                  note(COPY.actionsNote),
                ]
              : [note(COPY.actionsNoPlan)]),
            ...(improvement.suggestions.length > 0
              ? [
                  subHead(COPY.actionsSuggestTitle),
                  ...dataTable(
                    [
                      { title: "Công việc và căn cứ", width: 74 },
                      { title: "Gợi ý ưu tiên", width: 26 },
                    ],
                    improvement.suggestions.map((suggestion) => [
                      `${suggestion.text} (${suggestion.basis})`,
                      suggestion.priority,
                    ]),
                  ),
                  note(COPY.actionsSuggestNote),
                ]
              : []),
          ]
        : [],
    ),

    ...section(
      "R07 / CĂN CỨ TRỰC QUAN",
      "Hình ảnh và minh chứng chọn lọc",
      COPY.imagesIntro,
      await evidenceImages(model, images),
    ),

    ...section("R07 / TRUY XUẤT THÔNG TIN", "Danh mục căn cứ và giới hạn", COPY.evidenceIntro, [
      ...dataTable(
        [
          { title: "Mã căn cứ", width: 14 },
          { title: "Nội dung, câu liên quan", width: 46 },
          { title: "Kỳ, phạm vi", width: 22 },
          { title: "Tình trạng", width: 18 },
        ],
        evidence.rows.map((row) => [row.id, row.description, row.scope, row.status]),
      ),
      ...panel("Giới hạn dữ liệu", evidence.limitations),
      ...panel("Tình trạng xác minh", evidence.verificationStatement),
      ...panel("Tham chiếu công bố được phép", evidence.permittedReferences),
      note(COPY.evidenceNote),
    ]),

    ...section("R07 / CHI TIẾT HỒ SƠ", "Phụ lục câu trả lời", COPY.appendixIntro, [
      ...dataTable(
        [
          { title: "Mã câu", width: 11 },
          { title: "Câu hỏi", width: 39 },
          { title: "Câu trả lời", width: 28 },
          { title: "Trạng thái căn cứ", width: 22 },
        ],
        appendix.rows.map((row) => [row.id, row.question, row.answer, row.evidence]),
      ),
      ...panel("Nội dung chưa khai báo trong phạm vi", appendix.unansweredSummary),
      note(COPY.appendixNote),
    ]),

    ...sectionHead("R07 / KIỂM SOÁT PHIÊN BẢN", "Xác nhận và thông tin phát hành", COPY.confirmIntro),
    ...facts([
      { label: "Đơn vị báo cáo", value: meta.companyName },
      { label: "Ngày phát hành", value: meta.issuedAt },
      { label: "Vai trò người xác nhận", value: confirmation.role },
      { label: "Mã hồ sơ / phiên bản", value: `${meta.reportId} / ${meta.reportVersion}` },
      { label: "Thời điểm xác nhận", value: confirmation.confirmedAt },
      { label: "Bộ câu hỏi / dữ liệu", value: `${meta.contentVersion} / ${meta.answerVersion}` },
      { label: "Trạng thái xác nhận", value: confirmation.status },
    ]),
    subHead("Kênh truy xuất hồ sơ"),
    body(meta.reportReference),
    note(COPY.confirmNote),
    new Paragraph({
      spacing: { before: 400 },
      children: [run("ESG REPORT ONLINE", { bold: true, color: GREEN, size: 28 })],
    }),
    body(COPY.closing),
  ];

  const document = new Document({
    creator: "ESG Report Online",
    title: `Báo cáo ESG ${meta.companyName}`,
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1300, bottom: 1200, left: 1200, right: 1200 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  run(brand, { bold: true, color: MUTED, size: 16 }),
                  run(meta.isDraft ? "    BẢN NHÁP" : "", { bold: true, color: "B45309", size: 16 }),
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
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
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
