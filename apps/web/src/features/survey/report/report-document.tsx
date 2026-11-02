import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { toPercent } from "../lib/report-data";
import type {
  ReportData,
  ReportQuestion,
  StatusCounts,
} from "../lib/report-data";
import { REPORT_FONT_FAMILY } from "./fonts";
import type { ReportLogo } from "./report-logo";

const COLORS = {
  text: "#1a1a1a",
  muted: "#525252",
  border: "#a3a3a3",
  line: "#d4d4d4",
  surface: "#f2f2f2",
  implemented: "#2f6b3a",
  in_progress: "#b7791f",
  not_implemented: "#8a8a8a",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: REPORT_FONT_FAMILY,
    fontSize: 9,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: 700, lineHeight: 1.3 },
  subtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 1.3,
  },
  h2: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    lineHeight: 1.3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  h3: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 1.3,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
    paddingVertical: 3,
  },
  infoLabel: { width: 110, color: COLORS.muted },
  infoValue: { flex: 1 },
  statRow: { flexDirection: "row", marginTop: 6 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    marginRight: 6,
  },
  statBoxLast: { marginRight: 0 },
  statNumber: { fontSize: 18, fontWeight: 700, lineHeight: 1.2 },
  statLabel: { color: COLORS.muted, marginTop: 2, lineHeight: 1.3 },
  bar: {
    flexDirection: "row",
    height: 10,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
    paddingVertical: 3,
  },
  cellName: { flex: 1, paddingHorizontal: 4 },
  cellNum: { width: 46, textAlign: "right", paddingHorizontal: 4 },
  bold: { fontWeight: 700 },
  questionBlock: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
    paddingVertical: 5,
  },
  questionTitle: { fontWeight: 700 },
  meta: { color: COLORS.muted, marginTop: 1 },
  detailLine: { marginTop: 2 },
  tag: { fontWeight: 700 },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 4,
  },
  draftBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.in_progress,
    padding: 6,
    color: COLORS.text,
  },
  disclaimer: { marginTop: 14, fontSize: 8, color: COLORS.muted },
});

function statusColor(status: ReportQuestion["status"]): string {
  return status === null ? COLORS.muted : COLORS[status];
}

function getPeriodText(company: ReportData["company"]): string {
  if (company.period === "") {
    return `Năm ${company.year}`;
  }
  return `${company.period} năm ${company.year}`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value === "" ? "Không có" : value}</Text>
    </View>
  );
}

function StatBox({
  value,
  label,
  color,
  isLast,
}: {
  value: string;
  label: string;
  color: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={isLast ? [styles.statBox, styles.statBoxLast] : styles.statBox}
    >
      <Text style={[styles.statNumber, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StackedBar({ counts }: { counts: StatusCounts }) {
  const segments = [
    {
      key: "implemented",
      color: COLORS.implemented,
      value: counts.implemented,
    },
    {
      key: "in_progress",
      color: COLORS.in_progress,
      value: counts.in_progress,
    },
    {
      key: "not_implemented",
      color: COLORS.not_implemented,
      value: counts.not_implemented,
    },
  ].filter((segment) => segment.value > 0);
  return (
    <View style={styles.bar}>
      {segments.map((segment) => (
        <View
          key={segment.key}
          style={{ flexGrow: segment.value, backgroundColor: segment.color }}
        />
      ))}
    </View>
  );
}

function CountsTable({
  firstColumn,
  rows,
}: {
  firstColumn: string;
  rows: readonly { key: string; name: string; counts: StatusCounts }[];
}) {
  return (
    <View>
      <View style={styles.tableHead} wrap={false}>
        <Text style={[styles.cellName, styles.bold]}>{firstColumn}</Text>
        <Text style={[styles.cellNum, styles.bold]}>Đã</Text>
        <Text style={[styles.cellNum, styles.bold]}>Đang</Text>
        <Text style={[styles.cellNum, styles.bold]}>Chưa</Text>
        <Text style={[styles.cellNum, styles.bold]}>Tổng</Text>
        <Text style={[styles.cellNum, styles.bold]}>% Đã</Text>
      </View>
      {rows.map((row) => (
        <View key={row.key} style={styles.tableRow} wrap={false}>
          <Text style={styles.cellName}>{row.name}</Text>
          <Text style={styles.cellNum}>{row.counts.implemented}</Text>
          <Text style={styles.cellNum}>{row.counts.in_progress}</Text>
          <Text style={styles.cellNum}>{row.counts.not_implemented}</Text>
          <Text style={styles.cellNum}>{row.counts.total}</Text>
          <Text style={styles.cellNum}>
            {toPercent(row.counts.implemented, row.counts.total)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

function QuestionDetail({ question }: { question: ReportQuestion }) {
  return (
    <View style={styles.questionBlock}>
      <Text style={styles.questionTitle}>
        Câu {question.number}. {question.text}
      </Text>
      <Text style={styles.meta}>
        Trạng thái:{" "}
        <Text style={[styles.tag, { color: statusColor(question.status) }]}>
          {question.statusLabel}
        </Text>
        {"   "}Chủ đề: {question.aspect}
      </Text>
      {question.description !== "" ? (
        <Text style={styles.detailLine}>Mô tả: {question.description}</Text>
      ) : null}
      {question.evidence.length > 0 ? (
        <Text style={styles.detailLine}>
          Bằng chứng:{" "}
          {question.evidence
            .map((item) => `${item.name} (${item.size})`)
            .join("; ")}
        </Text>
      ) : null}
    </View>
  );
}

function Section({
  title,
  children,
  keepTogether = false,
}: {
  title: string;
  children: ReactNode;
  keepTogether?: boolean;
}) {
  return (
    <View wrap={!keepTogether}>
      <Text style={styles.h2} minPresenceAhead={60}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const LOGO_MAX_HEIGHT = 52;
const LOGO_MAX_WIDTH = 140;

function getLogoSize(logo: ReportLogo): { width: number; height: number } {
  const ratio = logo.width / logo.height;
  const width = Math.min(LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT * ratio);
  return { width, height: width / ratio };
}

interface ReportDocumentProps {
  data: ReportData;
  logo?: ReportLogo | null;
}

export function ReportDocument({ data, logo = null }: ReportDocumentProps) {
  const { company, totals } = data;
  const exportedAt = formatDateTime(data.exportedAt);
  const periodText = getPeriodText(company);
  const companyName =
    company.name === "" ? "Chưa nhập tên doanh nghiệp" : company.name;

  return (
    <Document
      title={`Báo cáo ESG ${companyName} ${periodText}`}
      author="ESGstudio"
      language="vi"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Báo cáo tự đánh giá ESG</Text>
            <Text style={styles.subtitle}>
              {companyName} · {periodText}
            </Text>
            <Text style={styles.meta}>Xuất ngày {exportedAt}</Text>
          </View>
          {logo ? <Image src={logo.src} style={getLogoSize(logo)} /> : null}
        </View>
        {data.draftNotice !== null ? (
          <View style={styles.draftBox}>
            <Text>
              <Text style={styles.bold}>BẢN NHÁP. </Text>
              {data.draftNotice}
            </Text>
          </View>
        ) : null}

        <Section title="1. Thông tin doanh nghiệp">
          <InfoRow label="Tên doanh nghiệp" value={company.name} />
          <InfoRow label="Lĩnh vực hoạt động" value={company.industry} />
          <InfoRow label="Quy mô nhân sự" value={company.headcount} />
          <InfoRow label="Địa chỉ trụ sở" value={company.address} />
          <InfoRow label="Kỳ báo cáo" value={periodText} />
          <InfoRow label="Phạm vi báo cáo" value={company.scope} />
        </Section>

        <Section title="2. Thống kê tổng quan">
          <View style={styles.statRow}>
            <StatBox
              value={`${totals.implemented}`}
              label={`Đã thực hiện (${toPercent(totals.implemented, totals.total)}%)`}
              color={COLORS.implemented}
            />
            <StatBox
              value={`${totals.in_progress}`}
              label={`Đang thực hiện (${toPercent(totals.in_progress, totals.total)}%)`}
              color={COLORS.in_progress}
            />
            <StatBox
              value={`${totals.not_implemented}`}
              label={`Chưa thực hiện (${toPercent(totals.not_implemented, totals.total)}%)`}
              color={COLORS.not_implemented}
            />
            <StatBox
              value={`${totals.total}`}
              label="Tổng số câu"
              color={COLORS.text}
              isLast
            />
          </View>
          <StackedBar counts={totals} />
        </Section>

        <Section title="3. Thống kê theo phần ESG" keepTogether>
          <CountsTable
            firstColumn="Phần"
            rows={data.pillars.map((pillar) => ({
              key: pillar.name,
              name: pillar.name,
              counts: pillar.counts,
            }))}
          />
        </Section>

        <Section title="4. Thống kê theo nhóm" keepTogether>
          <CountsTable
            firstColumn="Nhóm"
            rows={data.pillars.flatMap((pillar) =>
              pillar.groups.map((group) => ({
                key: `${pillar.name}-${group.position}`,
                name: `${group.position}. ${group.title} (${pillar.name})`,
                counts: group.counts,
              })),
            )}
          />
        </Section>

        <Section title="5. Thống kê theo chủ đề" keepTogether>
          <CountsTable
            firstColumn="Chủ đề"
            rows={data.aspects.map((aspect) => ({
              key: aspect.label,
              name: aspect.label,
              counts: aspect.counts,
            }))}
          />
        </Section>

        <Text style={styles.disclaimer}>
          Hồ sơ tự khai phục vụ quản lý nội bộ, không thay thế chứng nhận hoặc
          thẩm định ESG.
        </Text>

        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Điểm cần cải thiện</Text>
        <Text style={styles.subtitle}>
          Các câu đang thực hiện hoặc chưa thực hiện, theo từng nhóm.
        </Text>
        {data.improvements.length === 0 ? (
          <Text style={styles.detailLine}>
            Tất cả câu hỏi đã được thực hiện.
          </Text>
        ) : (
          data.improvements.map((group) => (
            <View key={group.groupPosition}>
              <Text style={styles.h3} minPresenceAhead={40}>
                {group.pillarName} · Nhóm {group.groupPosition}:{" "}
                {group.groupTitle}
              </Text>
              {group.items.map((item) => (
                <View key={item.number} style={styles.tableRow} wrap={false}>
                  <Text
                    style={{
                      width: 88,
                      color: statusColor(item.status),
                      fontWeight: 700,
                    }}
                  >
                    {item.statusLabel}
                  </Text>
                  <Text style={{ flex: 1 }}>
                    Câu {item.number}. {item.text}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Chi tiết câu trả lời</Text>
        {data.pillars.map((pillar) => (
          <View key={pillar.name}>
            <Text style={styles.h2} minPresenceAhead={60}>
              {pillar.name}
            </Text>
            {pillar.groups.map((group) => (
              <View key={group.position}>
                <Text style={styles.h3} minPresenceAhead={50}>
                  Nhóm {group.position}: {group.title}
                </Text>
                {group.questions.map((question) => (
                  <QuestionDetail key={question.number} question={question} />
                ))}
              </View>
            ))}
          </View>
        ))}
        <PageFooter />
      </Page>
    </Document>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>ESGstudio · Báo cáo tự đánh giá ESG</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Trang ${pageNumber}/${totalPages}`
        }
      />
    </View>
  );
}
