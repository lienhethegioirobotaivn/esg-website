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
}: {
  label: string;
  text: string | null;
  soft?: boolean;
}) {
  if (text === null || text === "") {
    return null;
  }
  return (
    <View style={soft ? styles.panelSoft : styles.panel} wrap={false}>
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
}: {
  columns: readonly Column[];
  rows: readonly (readonly string[])[];
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={{ marginTop: 8 }}>
      <View style={styles.tableHead} wrap={false} fixed={false}>
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
        <View key={rowIndex} style={styles.tableRow} wrap={false}>
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
  readonly caption: string;
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
            {image.code} — {image.caption}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function practiceTotal(counts: PracticeCounts): number {
  return counts.total;
}
