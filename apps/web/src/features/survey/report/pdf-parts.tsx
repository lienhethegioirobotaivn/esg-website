import { Image, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import type {
  ChartDatum,
  PracticeCounts,
  ReportItem,
  ReportMetric,
} from "@esg/shared";

import { COLORS, styles } from "./theme";

export function metricText(metric: ReportMetric | null): string | null {
  if (metric === null) {
    return null;
  }
  if (metric.state === "known") {
    return metric.unit === "" ? metric.text : `${metric.text} ${metric.unit}`;
  }
  return metric.text;
}

interface SectionHeadProps {
  kicker: string;
  title: string;
  intro?: string;
  onPage?: (pageNumber: number) => void;
  breakBefore?: boolean;
}

export function SectionHead({
  kicker,
  title,
  intro,
  onPage,
  breakBefore = false,
}: SectionHeadProps) {
  return (
    <>
      <Text
        style={{ fontSize: 1, lineHeight: "1pt", height: 1 }}
        break={breakBefore}
        minPresenceAhead={140}
        render={({ pageNumber }) => {
          onPage?.(pageNumber);
          return " ";
        }}
      />
      <Text style={styles.kicker} minPresenceAhead={130}>
        {kicker}
      </Text>
      <Text style={styles.h1} minPresenceAhead={110}>
        {title}
      </Text>
      {intro ? <Text style={styles.intro}>{intro}</Text> : null}
    </>
  );
}

export function SubHead({ children }: { children: string }) {
  return (
    <Text style={styles.h2} minPresenceAhead={60}>
      {children}
    </Text>
  );
}

export function Note({ children }: { children: string }) {
  return <Text style={styles.note}>{children}</Text>;
}

export function Panel({
  label,
  text,
  soft = false,
  breakable = false,
}: {
  label: string;
  text: string | null;
  soft?: boolean;
  breakable?: boolean;
}) {
  if (text === null || text === "") {
    return null;
  }
  return (
    <View style={soft ? styles.panelSoft : styles.panel} wrap={breakable}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

export function Kpis({
  items,
}: {
  items: readonly { label: string; value: string | null }[];
}) {
  const shown = items.filter(
    (item): item is { label: string; value: string } => item.value !== null,
  );
  if (shown.length === 0) {
    return null;
  }
  return (
    <View style={styles.kpiRow} wrap={false}>
      {shown.map((item) => (
        <View key={item.label} style={styles.kpi}>
          <Text style={styles.kpiLabel}>{item.label.toUpperCase()}</Text>
          <Text style={styles.kpiValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function Facts({
  items,
}: {
  items: readonly { label: string; value: string | null; full?: boolean }[];
}) {
  const shown = items.filter(
    (item): item is { label: string; value: string; full?: boolean } =>
      item.value !== null && item.value !== "",
  );
  if (shown.length === 0) {
    return null;
  }
  return (
    <View style={styles.factsGrid}>
      {shown.map((item, index) => (
        <View
          key={index}
          style={item.full ? styles.factFull : styles.fact}
          wrap={false}
        >
          <Text style={styles.label}>{item.label.toUpperCase()}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

interface Column {
  title: string;
  width: string;
}

export function DataTable({
  columns,
  rows,
  repeatHeader = false,
  splitRows = false,
}: {
  columns: readonly Column[];
  rows: readonly (readonly string[])[];
  repeatHeader?: boolean;
  splitRows?: boolean;
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={{ marginTop: 8 }}>
      <View style={styles.tableHead} wrap={false} fixed={repeatHeader}>
        {columns.map((column) => (
          <Text
            key={column.title}
            style={[styles.tableHeadText, { width: column.width, paddingRight: 6 }]}
          >
            {column.title}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.tableRow} wrap={splitRows}>
          {columns.map((column, index) => (
            <Text
              key={column.title}
              style={[styles.tableCell, { width: column.width, paddingRight: 6 }]}
            >
              {row[index] ?? ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ItemList({ items }: { items: readonly ReportItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={{ marginTop: 8 }}>
      <View style={styles.tableHead} wrap={false}>
        <Text style={[styles.tableHeadText, { width: "34%", paddingRight: 6 }]}>Nội dung</Text>
        <Text style={[styles.tableHeadText, { width: "36%", paddingRight: 6 }]}>Khai báo</Text>
        <Text style={[styles.tableHeadText, { width: "30%" }]}>Căn cứ</Text>
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.tableRow} wrap={false}>
          <Text style={[styles.tableCell, { width: "34%", paddingRight: 6 }]}>{item.label}</Text>
          <Text style={[styles.tableCell, { width: "36%", paddingRight: 6 }]}>{item.answer}</Text>
          <Text style={[styles.cellMuted, { width: "30%" }]}>{item.evidence}</Text>
        </View>
      ))}
    </View>
  );
}

export function Cols({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", marginTop: 8 }}>{children}</View>;
}

const STATUS_COLORS: Record<string, string> = {
  "Có": COLORS.yes,
  "Có một phần": COLORS.partial,
  "Chưa có": COLORS.no,
  "Chưa rõ": COLORS.unknown,
  "Không áp dụng": COLORS.na,
};

export function PracticeChart({ data }: { data: readonly ChartDatum[] }) {
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  if (total === 0) {
    return null;
  }
  return (
    <View style={{ marginTop: 8 }} wrap={false}>
      <Text style={styles.label}>TRẠNG THÁI THỰC HÀNH</Text>
      <View style={{ flexDirection: "row", height: 12, marginTop: 4, marginBottom: 6 }}>
        {data
          .filter((datum) => datum.value > 0)
          .map((datum) => (
            <View
              key={datum.label}
              style={{
                flexGrow: datum.value,
                flexBasis: 0,
                backgroundColor: STATUS_COLORS[datum.label] ?? COLORS.unknown,
              }}
            />
          ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {data.map((datum) => (
          <View key={datum.label} style={{ flexDirection: "row", marginRight: 12, marginBottom: 2 }}>
            <View
              style={{
                width: 7,
                height: 7,
                marginTop: 3,
                marginRight: 4,
                backgroundColor: STATUS_COLORS[datum.label] ?? COLORS.unknown,
              }}
            />
            <Text style={styles.cellMuted}>
              {datum.label}: {datum.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PillarChart({
  data,
}: {
  data: readonly { label: string; yes: number; partial: number; gap: number }[];
}) {
  const shown = data.filter((row) => row.yes + row.partial + row.gap > 0);
  if (shown.length === 0) {
    return null;
  }
  return (
    <View style={{ marginTop: 8 }} wrap={false}>
      <Text style={styles.label}>THỰC HÀNH THEO TRỤ CỘT (Có / Có một phần / Chưa có hoặc chưa rõ)</Text>
      {shown.map((row) => (
        <View key={row.label} style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
          <Text style={[styles.cellMuted, { width: 70 }]}>{row.label}</Text>
          <View style={{ flexDirection: "row", flexGrow: 1, height: 10 }}>
            {[
              { value: row.yes, color: COLORS.yes },
              { value: row.partial, color: COLORS.partial },
              { value: row.gap, color: COLORS.no },
            ]
              .filter((part) => part.value > 0)
              .map((part) => (
                <View
                  key={part.color}
                  style={{ flexGrow: part.value, flexBasis: 0, backgroundColor: part.color }}
                />
              ))}
          </View>
          <Text style={[styles.cellMuted, { width: 60, textAlign: "right" }]}>
            {row.yes} / {row.partial} / {row.gap}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function BarChart({
  title,
  data,
  unit,
}: {
  title: string;
  data: readonly ChartDatum[];
  unit: string;
}) {
  if (data.length === 0) {
    return null;
  }
  const max = Math.max(...data.map((datum) => datum.value), 0);
  return (
    <View style={{ marginTop: 8 }} wrap={false}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      {data.map((datum) => (
        <View key={datum.label} style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
          <Text style={[styles.cellMuted, { width: 110 }]}>{datum.label}</Text>
          <View style={{ flexGrow: 1, height: 9, backgroundColor: COLORS.panel }}>
            <View
              style={{
                height: 9,
                width: max === 0 ? "0%" : `${Math.max(2, (datum.value / max) * 100)}%`,
                backgroundColor: COLORS.blue,
              }}
            />
          </View>
          <Text style={[styles.cellMuted, { width: 70, textAlign: "right" }]}>
            {datum.value.toLocaleString("vi-VN", { maximumFractionDigits: 3 })}
            {unit === "" ? "" : ` ${unit}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function SupplyChainFlow({
  suppliers,
  downstream,
  company,
}: {
  suppliers: readonly string[];
  downstream: readonly string[];
  company: string;
}) {
  const column = (title: string, entries: readonly string[]) => (
    <View style={{ flexGrow: 1, flexBasis: 0, backgroundColor: COLORS.panel, padding: 8 }}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      {entries.length === 0 ? (
        <Text style={styles.cellMuted}>Chưa khai báo</Text>
      ) : (
        entries.map((entry) => (
          <Text key={entry} style={styles.tableCell}>
            • {entry}
          </Text>
        ))
      )}
    </View>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "stretch", marginTop: 8 }} wrap={false}>
      {column("Nhà cung cấp", suppliers)}
      <View style={{ width: 22, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: COLORS.blue, lineHeight: 1.2 }}>›</Text>
      </View>
      <View
        style={{
          flexGrow: 1,
          flexBasis: 0,
          backgroundColor: COLORS.navy,
          padding: 8,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 9, fontWeight: 700, color: COLORS.white, lineHeight: 1.4 }}>{company}</Text>
      </View>
      <View style={{ width: 22, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: COLORS.blue, lineHeight: 1.2 }}>›</Text>
      </View>
      {column("Đối tác đầu ra", downstream)}
    </View>
  );
}

export interface EvidenceImage {
  readonly code: string;
  readonly questionId: string;
  readonly fileName: string;
  readonly src: string;
}

export function EvidenceGallery({ images }: { images: readonly EvidenceImage[] }) {
  if (images.length === 0) {
    return null;
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
      {images.map((image) => (
        <View key={image.code} style={{ width: "50%", paddingRight: 8, marginBottom: 10 }} wrap={false}>
          <View
            style={{
              height: 140,
              backgroundColor: COLORS.panel,
              justifyContent: "center",
              alignItems: "center",
              padding: 4,
            }}
          >
            <Image src={image.src} style={{ maxHeight: 132, maxWidth: "100%", objectFit: "contain" }} />
          </View>
          <Text style={[styles.cellMuted, { marginTop: 3 }]}>
            {image.code} • {image.fileName}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function practiceTotal(counts: PracticeCounts): number {
  return counts.total;
}

export function Strip({ strip }: { strip: readonly string[] }) {
  const [title, ...steps] = strip;
  return (
    <View
      style={{ position: "absolute", left: 48, right: 48, bottom: 52, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: COLORS.line }}
    >
      <Text style={styles.label}>{(title ?? "").toUpperCase()}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
        {steps.map((step, index) => (
          <View key={step} style={{ flexDirection: "row", alignItems: "center", flexGrow: 1, flexBasis: 0 }}>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: COLORS.blue,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 7, fontWeight: 700, color: COLORS.white }}>{index + 1}</Text>
            </View>
            <Text style={[styles.cellMuted, { marginLeft: 5 }]}>{step}</Text>
            {index < steps.length - 1 ? (
              <View style={{ flexGrow: 1, height: 0.5, backgroundColor: COLORS.muted, marginHorizontal: 6 }} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function QuestionCards({ items }: { items: readonly ReportItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            width: "50%",
            paddingRight: 10,
            marginBottom: 9,
            paddingLeft: 7,
            borderLeftWidth: 1.5,
            borderLeftColor: COLORS.line,
          }}
          wrap={false}
        >
          <Text style={styles.h3}>{item.label}</Text>
          <Text style={styles.answer}>{item.answer}</Text>
          <Text style={styles.cellMuted}>{item.evidence}</Text>
        </View>
      ))}
    </View>
  );
}

const PILLAR_COLORS = { E: "#1E8E5A", S: "#164CFF", G: "#102642" } as const;

export function PillarBadge({ code, label }: { code: "E" | "S" | "G"; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 6 }}>
      <View
        style={{
          width: 22,
          height: 22,
          backgroundColor: PILLAR_COLORS[code],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.white }}>{code}</Text>
      </View>
      <Text style={[styles.label, { marginLeft: 8, marginBottom: 0 }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const SDG_TILE_COLORS: Record<number, string> = {
  3: "#4C9F38",
  4: "#C5192D",
  5: "#FF3A21",
  6: "#26BDE2",
  7: "#FCC30B",
  8: "#A21942",
  12: "#BF8B2E",
  13: "#3F7E44",
  16: "#00689D",
  17: "#19486A",
};

const SDG_NAMES: Record<number, string> = {
  3: "Sức khỏe và cuộc sống tốt",
  4: "Giáo dục chất lượng",
  5: "Bình đẳng giới",
  6: "Nước sạch và vệ sinh",
  7: "Năng lượng sạch và giá phải chăng",
  8: "Việc làm tử tế và tăng trưởng kinh tế",
  12: "Tiêu dùng và sản xuất có trách nhiệm",
  13: "Hành động vì khí hậu",
  16: "Hòa bình, công lý và thể chế vững mạnh",
  17: "Quan hệ đối tác vì các mục tiêu",
};

export function FrameworkRow({
  code,
  title,
  text,
  goals,
}: {
  code: "E" | "S" | "G";
  title: string;
  text: string;
  goals: readonly number[];
}) {
  return (
    <View style={{ marginTop: 14 }} wrap={false}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 30,
            height: 30,
            backgroundColor: PILLAR_COLORS[code],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: 700, color: COLORS.white }}>{code}</Text>
        </View>
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.h2}>{title}</Text>
          <Text style={[styles.cellMuted, { marginTop: -3 }]}>{text}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
        {goals.map((goal) => (
          <View key={goal} style={{ width: "25%", paddingRight: 6, marginBottom: 6 }}>
            <View
              style={{
                height: 46,
                backgroundColor: SDG_TILE_COLORS[goal] ?? COLORS.navy,
                padding: 5,
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: 700, color: COLORS.white }}>{goal}</Text>
              <Text style={{ fontSize: 5.8, color: COLORS.white }}>{SDG_NAMES[goal] ?? ""}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
