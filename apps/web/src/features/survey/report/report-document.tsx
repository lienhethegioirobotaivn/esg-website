import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { ReportMetric, ReportModel, ReportTheme } from "@esg/shared";
import { Fragment } from "react";
import type { ReactNode } from "react";

import { HTML_LANG } from "@/features/locale/constants";
import type { Locale } from "@/features/locale/constants";
import { msg } from "@/features/locale/lib/translate";
import type { TFunction } from "@/features/locale/lib/translate";

import { COPY } from "./copy";
import {
  BarChart,
  Cols,
  DataTable,
  Facts,
  FrameworkRow,
  Kpis,
  Note,
  Panel,
  PillarBadge,
  PillarChart,
  PlanTimeline,
  PracticeChart,
  QuestionCards,
  SectionHead,
  Strip,
  SubHead,
  SupplyChainFlow,
  metricText,
} from "./pdf-parts";
import type { EvidenceImage } from "./pdf-parts";
import type { ReportLogo } from "./report-logo";
import { ReportTextProvider } from "./report-text-context";
import { reportFontFamily } from "./fonts";
import { ReportThemeProvider } from "./report-theme-context";
import { createReportStyles } from "./theme";

export const TOC_KEYS = [
  "framework",
  "summary",
  "R01",
  "R02",
  "R03",
  "R04",
  "R05",
  "R06",
  "R07",
] as const;
export type TocKey = (typeof TOC_KEYS)[number];

const TOC_ROWS: Record<TocKey, { tag: string; title: string }> = {
  framework: { tag: msg("Khung tham chiếu"), title: msg("Khung ESG và SDG") },
  summary: { tag: msg("Tổng quan"), title: msg("Tóm tắt điều hành") },
  R01: { tag: "R01", title: msg("Hồ sơ và phạm vi") },
  R02: { tag: "R02", title: msg("Môi trường") },
  R03: { tag: "R03", title: msg("Người lao động và xã hội") },
  R04: { tag: "R04", title: msg("Quản trị") },
  R05: { tag: "R05", title: msg("Nội dung theo ngành") },
  R06: { tag: "R06", title: msg("Kế hoạch cải thiện") },
  R07: { tag: "R07", title: msg("Căn cứ, giới hạn và xác nhận") },
};

const FRAMEWORK_STRIP = [
  msg("Từ hoạt động đến thông tin và hành động"),
  msg("Xác định phạm vi"),
  msg("Thu thập dữ liệu"),
  msg("Rà soát căn cứ"),
  msg("Cải thiện"),
] as const;

interface ReportDocumentProps {
  model: ReportModel;
  theme: ReportTheme;
  logo: ReportLogo | null;
  images: readonly EvidenceImage[];
  draftNotice: string | null;
  pages: Readonly<Partial<Record<TocKey, number>>>;
  onPage: (key: TocKey, pageNumber: number) => void;
  t: TFunction;
  locale: Locale;
}

interface TopicProps {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  tocKey?: TocKey;
  strip?: readonly string[];
  pillar?: { code: "E" | "S" | "G"; label: string };
  children: ReactNode;
}

function value(metric: ReportMetric | null): string | null {
  return metricText(metric);
}

function has(...parts: readonly unknown[]): boolean {
  return parts.some((part) => {
    if (part === null || part === undefined || part === false || part === "") {
      return false;
    }
    return true;
  });
}

function reportYear(period: string): string | null {
  const match = period.match(/(\d{4})\D*$/);
  return match?.[1] ?? null;
}

export function ReportDocument({
  model,
  theme,
  logo,
  images,
  draftNotice,
  pages,
  onPage,
  t,
  locale,
}: ReportDocumentProps) {
  const { meta, summary, profile, environment, social, governance, improvement, evidence, appendix, confirmation, charts } = model;
  const reportStyles = createReportStyles(theme);
  const { COLORS, styles } = reportStyles;
  const track = (key: TocKey) => (pageNumber: number) => onPage(key, pageNumber);
  const envPillar = charts.pillarStatus.find((row) => row.label === "Môi trường" || row.label === t("Môi trường"));
  const fontFamily = reportFontFamily(locale, theme.font);
  const brand = meta.tradingName ?? meta.companyName;
  const year = reportYear(meta.period);
  const strips = COPY.strips;
  const moduleStrips: Record<string, readonly string[]> = COPY.strips;
  const moduleIntros: Record<string, string> = COPY.moduleIntros;
  const tocRows = TOC_KEYS.filter((key) => key !== "R05" || model.modules.length > 0);

  const topic = ({ id, kicker, title, intro, tocKey, strip, pillar, children }: TopicProps) => (
    <Page key={id} size="A4" style={[styles.page, { fontFamily, paddingBottom: strip ? 118 : PAGE_BOTTOM }]} wrap>
      <View style={styles.header} fixed>
        <Text style={styles.headerBrand}>{brand}</Text>
        <Text style={styles.footerText}>ESG REPORT ONLINE</Text>
      </View>
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          {meta.status} • {meta.reportId}
        </Text>
        <Text style={styles.footerText} render={({ pageNumber }) => `${pageNumber}`} />
      </View>
      {pillar ? <PillarBadge code={pillar.code} label={pillar.label} /> : null}
      <SectionHead
        kicker={kicker}
        title={title}
        intro={intro}
        onPage={tocKey ? track(tocKey) : undefined}
      />
      {children}
      {strip ? <Strip strip={strip} /> : null}
    </Page>
  );

  const imageCodes = new Set(images.map((image) => image.code));
  const evidenceGroups = evidence.groups.filter((group) =>
    group.files.some((file) => imageCodes.has(file.code)),
  );
  const hasEnergy = has(environment.electricity, environment.fuel, environment.energy.items.length > 0, environment.energy.assessment);
  const hasGhg = has(environment.scope1, environment.scope2, environment.climate.items.length > 0);
  const hasWater = has(environment.water, environment.wastewater, environment.waterSection.items.length > 0, environment.waterSection.assessment);
  const hasWaste = has(environment.wasteNonHazardous, environment.wasteHazardous, environment.waste.items.length > 0, environment.waste.assessment);
  const hasMaterials = environment.materials.items.length > 0;
  const hasIncident = has(environment.incident, environment.targets.items.length > 0, environment.targets.assessment);
  const hasValueChain = has(profile.products, profile.markets, profile.revenueBand, charts.supplyChain);
  const hasWorkforce = has(social.headcount, social.workerScope, social.workforceTable, social.workforce.items.length > 0, social.workforce.assessment);
  const hasSafety = has(social.accidents, social.fatalities, social.safety.items.length > 0, social.safety.assessment);
  const hasLabour = has(social.labour.items.length > 0, social.labour.assessment);
  const hasCommunity = has(social.trainingHours, social.community.items.length > 0, social.community.assessment);
  const hasGovernance = has(governance.esgRole, governance.leadershipReview, governance.priorities, governance.coordination.items.length > 0, governance.coordination.assessment);
  const hasIntegrity = has(governance.integrityIncident, governance.integrity.items.length > 0, governance.integrity.assessment);
  const hasSupply = has(governance.supply.items.length > 0, governance.supply.assessment, profile.supplierGroups.length > 0);
  const hasData = has(governance.data.items.length > 0, governance.data.assessment);
  const hasGaps = has(improvement.gaps.length > 0, improvement.followups, improvement.focus);
  const hasPlan = has(improvement.actions.length > 0, improvement.goal, improvement.resources, improvement.reviewCycle);
  const hasActions = has(hasPlan, improvement.suggestions.length > 0);
  const firstOf = (flags: readonly boolean[], names: readonly string[]): string | null => {
    const index = flags.findIndex(Boolean);
    return index === -1 ? null : (names[index] ?? null);
  };
  const r02First = "overview";
  const r03First = firstOf(
    [hasWorkforce, hasSafety, hasLabour, hasCommunity],
    ["workforce", "safety", "labour", "community"],
  );
  const r04First = firstOf(
    [hasGovernance, hasIntegrity, hasSupply, hasData],
    ["governance", "integrity", "supply", "data"],
  );
  const r06First = hasGaps ? "gaps" : hasActions ? "actions" : null;
  const r07FirstKey = images.length > 0 ? "images" : "refs";
  const r07First = r07FirstKey;

  const coverKind = theme.layout.cover;
  const coverOnDark = coverKind === "solid";
  const coverInk = coverOnDark ? COLORS.white : COLORS.ink;
  const coverTitle = coverKind === "plain" ? COLORS.ink : coverOnDark ? COLORS.white : COLORS.navy;
  const coverRule = coverKind === "plain" ? COLORS.ink : coverOnDark ? COLORS.white : COLORS.blue;
  const coverMuted = coverOnDark ? { color: COLORS.white, opacity: 0.8 } : { color: COLORS.muted };
  const coverLabelColor = coverOnDark || coverKind === "band" ? COLORS.white : COLORS.muted;
  const coverLabel = (
    <Text style={{ fontSize: 8, letterSpacing: 1.4, color: coverLabelColor, lineHeight: 1.3 }}>
      {t("HỒ SƠ DOANH NGHIỆP")}
    </Text>
  );
  const coverLogoImage = logo ? (
    <Image
      src={logo.src}
      style={{ width: Math.min(130, (logo.width / logo.height) * 44), height: 44, objectFit: "contain" }}
    />
  ) : null;
  const coverLogo =
    logo && (coverOnDark || coverKind === "band") ? (
      <View style={{ backgroundColor: COLORS.white, padding: 8, borderRadius: reportStyles.radius }}>
        {coverLogoImage}
      </View>
    ) : (
      coverLogoImage
    );

  return (
    <ReportTextProvider t={t} locale={locale}>
    <ReportThemeProvider value={reportStyles}>
    <Document
      title={t("Báo cáo ESG {name}", { name: meta.companyName })}
      author="ESG Report Online"
      language={HTML_LANG[locale]}
    >
      <Page size="A4" style={[styles.page, { fontFamily, backgroundColor: coverOnDark ? COLORS.navy : COLORS.white, paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0 }]}>
        {coverKind === "sidebar" ? (
          <>
            <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 26, backgroundColor: COLORS.navy }} />
            <View style={{ position: "absolute", top: 0, bottom: 0, left: 26, width: 5, backgroundColor: COLORS.blue }} />
          </>
        ) : null}
        {coverKind === "band" ? (
          <View style={{ height: 112, paddingHorizontal: 64, backgroundColor: COLORS.navy, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            {coverLabel}
            {coverLogo}
          </View>
        ) : null}
        <View style={{ height: coverKind === "band" ? 728 : 840, paddingHorizontal: 64 }}>
          {coverKind === "band" ? null : (
            <View style={{ marginTop: 64, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              {coverLabel}
              {coverLogo}
            </View>
          )}
          <View style={{ marginTop: coverKind === "band" ? 146 : coverOnDark && logo ? 134 : 150 }}>
            <View style={{ width: 36, height: 3, backgroundColor: coverRule }} />
            <Text style={{ fontSize: 40, fontWeight: 700, color: coverTitle, lineHeight: 1.15, marginTop: 22 }}>
              {t("BÁO CÁO ESG")}
            </Text>
            {year ? (
              <Text style={{ fontSize: 28, lineHeight: 1.2, marginTop: 4, ...coverMuted }}>{year}</Text>
            ) : null}
            <Text style={{ fontSize: 18, fontWeight: 700, color: coverTitle, lineHeight: 1.35, marginTop: 44 }}>
              {meta.companyName}
            </Text>
            <Text style={{ fontSize: 10, lineHeight: 1.4, marginTop: 10, ...coverMuted }}>
              {t("Môi trường")} • {t("Xã hội")} • {t("Quản trị")}
            </Text>
            <Text style={{ fontSize: 10, lineHeight: 1.4, marginTop: 3, ...coverMuted }}>
              {t("Kỳ báo cáo {period}", { period: meta.period })}
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              left: 64,
              right: 64,
              bottom: 56,
              borderTopWidth: 0.5,
              borderTopColor: COLORS.line,
              paddingTop: 12,
            }}
          >
            <Text style={{ fontSize: 10, color: coverInk, lineHeight: 1.5 }}>{t(COPY.coverTagline)}</Text>
            <Text style={{ fontSize: 8, lineHeight: 1.5, marginTop: 4, ...coverMuted }}>{t(COPY.coverNote)}</Text>
            <Text style={{ fontSize: 8, fontWeight: 700, color: coverInk, letterSpacing: 1.2, marginTop: 12 }}>
              ESG REPORT ONLINE
            </Text>
          </View>
        </View>
      </Page>

      {topic({
        id: "about",
        kicker: t("VỀ BÁO CÁO NÀY"),
        title: t("Cách đọc và sử dụng báo cáo"),
        intro: t(COPY.aboutIntro),
        strip: strips.pillars,
        children: (
          <>
            <Cols>
              <View style={{ width: "58%", paddingRight: 14 }}>
                <Panel label={t(COPY.basisTitle)} text={t(COPY.basisBody)} soft />
                <Panel label={t(COPY.layersTitle)} text={t(COPY.layersBody)} soft />
              </View>
              <View style={{ width: "42%" }}>
                <Facts
                  items={[
                    { label: t("Mức khai báo"), value: meta.disclosureLevel, full: true },
                    { label: t("Phiên bản bộ câu hỏi"), value: meta.contentVersion, full: true },
                    { label: t("Phiên bản dữ liệu"), value: meta.answerVersion, full: true },
                    { label: t("Tình trạng rà soát"), value: meta.reviewStatus, full: true },
                  ]}
                />
              </View>
            </Cols>
            <SubHead>{t("Ý nghĩa của trạng thái")}</SubHead>
            <DataTable
              columns={[
                { title: t("Trạng thái"), width: "34%" },
                { title: t("Cách đọc"), width: "66%" },
              ]}
              rows={COPY.statusLegend.map((row) => [t(row[0]), t(row[1])])}
            />
            <Note>{t(COPY.aboutNote)}</Note>
            <Text style={[styles.body, { marginTop: 10, fontWeight: 700, color: COLORS.navy }]}>
              {t("Trạng thái {status}   |   Mã hồ sơ {reportId}   |   Phát hành {issuedAt}", {
                status: meta.status,
                reportId: meta.reportId,
                issuedAt: meta.issuedAt,
              })}
            </Text>
          </>
        ),
      })}

      {topic({
        id: "toc",
        kicker: t("BẢN ĐỒ NỘI DUNG"),
        title: t("Nội dung báo cáo"),
        intro: t(COPY.tocIntro),
        strip: strips.pillars,
        children: (
          <Cols>
            <View style={{ width: "54%", paddingRight: 16 }}>
              {tocRows.map((key) => {
                const row = TOC_ROWS[key];
                return (
                  <View
                    key={key}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottomWidth: 0.5,
                      borderBottomColor: COLORS.line,
                      paddingVertical: 6,
                    }}
                    wrap={false}
                  >
                    <View>
                      <Text style={styles.label}>{t(row.tag).toUpperCase()}</Text>
                      <Text style={[styles.body, { fontWeight: 700, color: COLORS.navy }]}>{t(row.title)}</Text>
                    </View>
                    <Text style={[styles.body, { fontWeight: 700, color: COLORS.blue }]}>{pages[key] ?? ""}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ width: "46%" }}>
              <SubHead>{t("Thông tin kiểm soát tài liệu")}</SubHead>
              <Facts
                items={[
                  { label: t("Đơn vị báo cáo"), value: meta.companyName, full: true },
                  { label: t("Phạm vi địa lý"), value: meta.countries, full: true },
                  { label: t("Kỳ dữ liệu"), value: meta.period, full: true },
                  { label: t("Phiên bản báo cáo"), value: meta.reportVersion, full: true },
                ]}
              />
              <Note>{t(COPY.tocNote)}</Note>
            </View>
          </Cols>
        ),
      })}

      {topic({
        id: "framework",
        kicker: t("KHUNG THAM CHIẾU"),
        title: t("Khung ESG và các mục tiêu SDG"),
        intro: t(COPY.frameworkIntro),
        tocKey: "framework",
        strip: FRAMEWORK_STRIP,
        children: (
          <>
            <FrameworkRow
              code="E"
              title={t("Môi trường")}
              text={t("Tài nguyên, vật liệu và tác động khí hậu.")}
              goals={[6, 7, 12, 13]}
            />
            <FrameworkRow
              code="S"
              title={t("Xã hội")}
              text={t("Điều kiện làm việc, sức khỏe và phát triển con người.")}
              goals={[3, 4, 5, 8]}
            />
            <FrameworkRow
              code="G"
              title={t("Quản trị")}
              text={t("Liêm chính, trách nhiệm và quan hệ hợp tác.")}
              goals={[16, 17]}
            />
            <Note>{t(COPY.frameworkPillars)}</Note>
            <Note>{t(COPY.frameworkNote)}</Note>
            <Note>{t(COPY.frameworkSource)}</Note>
            <Note>{t(COPY.frameworkDisclaimer)}</Note>
          </>
        ),
      })}

      {topic({
        id: "summary",
        kicker: t("TỔNG QUAN TRONG KỲ"),
        title: t("Tóm tắt điều hành"),
        intro: t(COPY.summaryIntro),
        tocKey: "summary",
        strip: strips.pillars,
        children: (
          <>
            {draftNotice ? <Panel label={t("Bản nháp")} text={draftNotice} /> : null}
            <Kpis
              items={[
                { label: t("Khai báo hợp lệ"), value: String(summary.answeredCount) },
                { label: t("Tài liệu đã đính kèm"), value: String(summary.evidenceCount) },
                { label: t("Nội dung cần bổ sung"), value: String(summary.openItemsCount) },
              ]}
            />
            <Text style={[styles.body, { marginTop: 10 }]}>{summary.executiveSummary}</Text>
            <Cols>
              <View style={{ width: "54%", paddingRight: 14 }}>
                <PracticeChart data={charts.practiceStatus} />
                <PillarChart data={charts.pillarStatus} />
              </View>
              <View style={{ width: "46%" }}>
                {summary.priorities.length > 0 ? (
                  <View style={styles.panel} wrap={false}>
                    <Text style={styles.label}>{t("ƯU TIÊN ĐƯỢC GHI NHẬN")}</Text>
                    {summary.priorities.map((priority, index) => (
                      <View key={index} style={{ flexDirection: "row", marginTop: 6 }}>
                        <Text style={[styles.answer, { width: 22 }]}>{String(index + 1).padStart(2, "0")}</Text>
                        <Text style={[styles.body, { flexGrow: 1, flexBasis: 0 }]}>{priority}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </Cols>
            <Note>{t(COPY.summaryNote)}</Note>
            {summary.priorities.length > 0 ? <Note>{t(COPY.prioritiesNote)}</Note> : null}
          </>
        ),
      })}

      {topic({
        id: "profile",
        kicker: t("R01 / NHẬN DIỆN"),
        title: t("Hồ sơ doanh nghiệp"),
        intro: t(COPY.profileIntro),
        tocKey: "R01",
        strip: strips.profile,
        children: (
          <>
            <Facts
              items={[
                { label: t("Tên pháp lý"), value: meta.companyName },
                { label: t("Tên giao dịch"), value: meta.tradingName },
                { label: t("Mã số doanh nghiệp"), value: meta.registrationId },
                { label: t("Loại hình pháp lý"), value: meta.legalForm },
              ]}
            />
            <Panel label={t("Nhận định theo hồ sơ")} text={profile.orgContext} soft />
            <Facts
              items={[
                { label: t("Ngành chính"), value: profile.primarySector },
                { label: t("Ngành bổ sung"), value: profile.secondarySectors },
                { label: t("Nhóm quy mô nhân sự"), value: profile.sizeBand },
                { label: t("Hoạt động chính"), value: profile.activities },
              ]}
            />
          </>
        ),
      })}

      {topic({
        id: "scope",
        kicker: t("R01 / CƠ SỞ LẬP HỒ SƠ"),
        title: t("Phạm vi và ranh giới dữ liệu"),
        intro: t(COPY.scopeIntro),
        strip: strips.scope,
        children: (
          <>
            <Facts
              items={[
                { label: t("Kỳ báo cáo"), value: meta.period },
                { label: t("Hoạt động đặc thù"), value: profile.capabilities },
                { label: t("Quốc gia, vùng hoạt động"), value: meta.countries },
                { label: t("Có người lao động trong kỳ"), value: profile.employeesPresence },
                { label: t("Cơ sở trong phạm vi"), value: profile.sites.length > 0 ? profile.sites.map((site) => site.name).join("; ") : null },
                { label: t("Nhà thầu và lao động thuê ngoài"), value: profile.contractorPresence },
              ]}
            />
            {profile.sites.length > 0 ? (
              <View>
                <SubHead>{t("Danh mục cơ sở")}</SubHead>
                <DataTable
                  columns={[
                    { title: t("Cơ sở"), width: "34%" },
                    { title: t("Hoạt động được tính"), width: "33%" },
                    { title: t("Giới hạn"), width: "33%" },
                  ]}
                  rows={profile.sites.map((site) => [site.name, site.scope, site.limit])}
                />
              </View>
            ) : null}
            <Panel label={t("Giới hạn phạm vi")} text={profile.scopeLimitations} soft />
            <Note>{t(COPY.scopeNote)}</Note>
          </>
        ),
      })}

      {hasValueChain
        ? topic({
            id: "value-chain",
            kicker: t("R01 / BỐI CẢNH KINH DOANH"),
            title: t("Hoạt động và chuỗi giá trị"),
            intro: t(COPY.valueChainIntro),
            strip: strips.valueChain,
            children: (
              <>
                <Facts
                  items={[
                    { label: t("Sản phẩm, dịch vụ chính"), value: profile.products },
                    { label: t("Nhóm nhà cung cấp quan trọng"), value: profile.supplierGroupsText },
                    { label: t("Thị trường và nhóm khách hàng"), value: profile.markets },
                    { label: t("Nhóm đối tác đầu ra"), value: profile.downstreamGroupsText },
                    { label: t("Khoảng doanh thu tự nguyện"), value: profile.revenueBand, full: true },
                  ]}
                />
                {charts.supplyChain ? (
                  <SupplyChainFlow
                    suppliers={charts.supplyChain.suppliers}
                    downstream={charts.supplyChain.downstream}
                    company={meta.companyName}
                  />
                ) : null}
                <Panel label={t("Nhận định theo hồ sơ")} text={profile.valueChainContext} soft />
                <Note>{t(COPY.valueChainNote)}</Note>
              </>
            ),
          })
        : null}

      {topic({
        id: "env-overview",
        kicker: t("R02 / MÔI TRƯỜNG"),
        title: t("Tổng quan môi trường"),
        intro: t(COPY.envIntro),
        tocKey: r02First === "overview" ? "R02" : undefined,
        strip: strips.env,
        pillar: { code: "E", label: t("Môi trường") },
        children: (
          <>
            <Kpis
              items={[
                { label: t("Điện sử dụng"), value: value(environment.electricity) },
                { label: t("Nước sử dụng"), value: value(environment.water) },
                { label: t("Dữ liệu phát thải"), value: environment.ghgStatus },
              ]}
            />
            {envPillar ? <PillarChart data={[envPillar]} /> : null}
            <Cols>
              <View style={{ width: "50%", paddingRight: 8 }}>
                <Panel label={t("Nhận định theo hồ sơ")} text={environment.overviewAssessment} soft />
              </View>
              <View style={{ width: "50%" }}>
                <Panel label={t("Những nội dung cần làm rõ")} text={environment.overviewGaps} />
              </View>
            </Cols>
          </>
        ),
      })}

      {hasEnergy
        ? topic({
            id: "energy",
            kicker: t("R02 / NĂNG LƯỢNG"),
            title: t("Năng lượng và sử dụng hiệu quả"),
            intro: t(COPY.energyIntro),
            strip: strips.energy,
            children: (
              <>
                <Facts
                  items={[
                    { label: t("Điện tiêu thụ trong kỳ"), value: value(environment.electricity) },
                    { label: t("Nguồn, cách tổng hợp"), value: environment.electricity?.source ?? null },
                    { label: t("Nhiên liệu"), value: value(environment.fuel) },
                    { label: t("Nguồn nhiên liệu"), value: environment.fuel?.source ?? null },
                  ]}
                />
                <QuestionCards items={environment.energy.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={environment.energy.assessment} soft />
              </>
            ),
          })
        : null}

      {hasGhg
        ? topic({
            id: "ghg",
            kicker: t("R02 / PHẦN KHAI BÁO MỞ RỘNG"),
            title: t("Khí nhà kính và rủi ro khí hậu"),
            intro: t(COPY.ghgIntro),
            strip: strips.ghg,
            children: (
              <>
                <DataTable
                  columns={[
                    { title: t("Chỉ số"), width: "34%" },
                    { title: t("Giá trị"), width: "33%" },
                    { title: t("Phạm vi"), width: "33%" },
                  ]}
                  rows={[
                    environment.scope1
                      ? ["Scope 1", value(environment.scope1) ?? "", environment.scope1.source]
                      : null,
                    environment.scope2
                      ? ["Scope 2 location-based", value(environment.scope2) ?? "", environment.scope2.source]
                      : null,
                  ].filter((row): row is string[] => row !== null)}
                />
                <Cols>
                  <View style={{ width: "55%", paddingRight: 8 }}>
                    <Facts
                      items={[
                        { label: t("Phương pháp và ranh giới"), value: environment.ghgMethod, full: true },
                        { label: t("Nguồn tính, hệ số được sử dụng"), value: environment.ghgSources, full: true },
                      ]}
                    />
                  </View>
                  <View style={{ width: "45%" }}>
                    <Panel label={t("Nhận định theo hồ sơ")} text={environment.climate.assessment} soft />
                  </View>
                </Cols>
                <Note>{t(COPY.ghgNote)}</Note>
                <BarChart title={t("Phát thải trong phạm vi")} data={charts.ghg} unit="tCO₂e" />
                <QuestionCards items={environment.climate.items} />
              </>
            ),
          })
        : null}

      {hasWater
        ? topic({
            id: "water",
            kicker: t("R02 / TÀI NGUYÊN NƯỚC"),
            title: t("Nước và nước thải"),
            intro: t(COPY.waterIntro),
            strip: strips.water,
            children: (
              <>
                <Facts
                  items={[
                    { label: t("Nước sử dụng"), value: value(environment.water) },
                    { label: t("Phạm vi và nguồn số liệu"), value: environment.water?.source ?? null },
                    { label: t("Cách thu gom, xử lý nước thải"), value: value(environment.wastewater), full: true },
                  ]}
                />
                <Panel label={t("Nhận định theo hồ sơ")} text={environment.waterSection.assessment} soft />
                <QuestionCards items={environment.waterSection.items} />
              </>
            ),
          })
        : null}

      {hasWaste
        ? topic({
            id: "waste",
            kicker: t("R02 / CHẤT THẢI"),
            title: t("Chất thải và quản lý dòng thải"),
            intro: t(COPY.wasteIntro),
            strip: strips.waste,
            children: (
              <>
                <Facts
                  items={[
                    { label: t("Không nguy hại"), value: value(environment.wasteNonHazardous) },
                    { label: t("Nguy hại"), value: value(environment.wasteHazardous) },
                    { label: t("Nguồn số liệu không nguy hại"), value: environment.wasteNonHazardous?.source ?? null },
                    { label: t("Nguồn số liệu nguy hại"), value: environment.wasteHazardous?.source ?? null },
                  ]}
                />
                <BarChart title={t("Chất thải")} data={charts.waste} unit="tấn" />
                <QuestionCards items={environment.waste.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={environment.waste.assessment} soft />
              </>
            ),
          })
        : null}

      {hasMaterials
        ? topic({
            id: "materials",
            kicker: t("R02 / CÁC TÁC ĐỘNG LIÊN QUAN"),
            title: t("Vật liệu và tác động tại cơ sở"),
            intro: t(COPY.materialsIntro),
            strip: strips.materials,
            children: (
              <>
                <QuestionCards items={environment.materials.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={environment.materials.assessment} soft />
              </>
            ),
          })
        : null}

      {hasIncident
        ? topic({
            id: "incident",
            kicker: t("R02 / THEO DÕI VÀ CẢI THIỆN"),
            title: t("Sự cố và mục tiêu môi trường"),
            intro: t(COPY.incidentIntro),
            strip: strips.incident,
            children: (
              <>
                <QuestionCards items={environment.incident ? [environment.incident] : []} />
                <SubHead>{t("Mục tiêu môi trường")}</SubHead>
                <QuestionCards items={environment.targets.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={environment.targets.assessment} soft />
              </>
            ),
          })
        : null}

      {hasWorkforce
        ? topic({
            id: "workforce",
            kicker: t("R03 / NGƯỜI LAO ĐỘNG VÀ XÃ HỘI"),
            title: t("Con người và điều kiện làm việc"),
            intro: t(COPY.workforceIntro),
            tocKey: r03First === "workforce" ? "R03" : undefined,
            strip: strips.workforce,
            pillar: { code: "S", label: t("Xã hội") },
            children: (
              <>
                <Kpis items={[{ label: t("Người lao động cuối kỳ"), value: value(social.headcount) }]} />
                <Facts
                  items={[
                    { label: t("Phạm vi người lao động"), value: social.workerScope, full: true },
                    { label: t("Cơ cấu lao động"), value: value(social.workforceTable), full: true },
                  ]}
                />
                <QuestionCards items={social.workforce.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={social.workforce.assessment} soft />
              </>
            ),
          })
        : null}

      {hasSafety
        ? topic({
            id: "safety",
            kicker: t("R03 / MÔI TRƯỜNG LÀM VIỆC"),
            title: t("An toàn và sức khỏe nghề nghiệp"),
            intro: t(COPY.safetyIntro),
            tocKey: r03First === "safety" ? "R03" : undefined,
            strip: strips.safety,
            pillar: r03First === "safety" ? { code: "S", label: t("Xã hội") } : undefined,
            children: (
              <>
                <Kpis
                  items={[
                    { label: t("Tai nạn lao động trong kỳ"), value: value(social.accidents) },
                    { label: t("Tử vong liên quan công việc"), value: value(social.fatalities) },
                  ]}
                />
                <QuestionCards items={social.safety.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={social.safety.assessment} soft />
              </>
            ),
          })
        : null}

      {hasLabour
        ? topic({
            id: "labour",
            kicker: t("R03 / ĐỐI XỬ CÓ TRÁCH NHIỆM"),
            title: t("Quyền lao động và đối thoại"),
            intro: t(COPY.labourIntro),
            tocKey: r03First === "labour" ? "R03" : undefined,
            strip: strips.labour,
            pillar: r03First === "labour" ? { code: "S", label: t("Xã hội") } : undefined,
            children: (
              <>
                <QuestionCards items={social.labour.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={social.labour.assessment} soft />
                <Note>{t(COPY.labourNote)}</Note>
              </>
            ),
          })
        : null}

      {hasCommunity
        ? topic({
            id: "community",
            kicker: t("R03 / ĐÀO TẠO VÀ QUAN HỆ XÃ HỘI"),
            title: t("Năng lực và quan hệ với các bên"),
            intro: t(COPY.communityIntro),
            tocKey: r03First === "community" ? "R03" : undefined,
            strip: strips.community,
            pillar: r03First === "community" ? { code: "S", label: t("Xã hội") } : undefined,
            children: (
              <>
                <Facts
                  items={[
                    { label: t("Tổng thời lượng đào tạo"), value: value(social.trainingHours) },
                    { label: t("Nguồn tổng hợp"), value: social.trainingHours?.source ?? null },
                  ]}
                />
                <Panel label={t("Nhận định theo hồ sơ")} text={social.community.assessment} soft />
                <QuestionCards items={social.community.items} />
              </>
            ),
          })
        : null}

      {hasGovernance
        ? topic({
            id: "governance",
            kicker: t("R04 / QUẢN TRỊ"),
            title: t("Trách nhiệm và điều phối ESG"),
            intro: t(COPY.governanceIntro),
            tocKey: r04First === "governance" ? "R04" : undefined,
            strip: strips.governance,
            pillar: { code: "G", label: t("Quản trị") },
            children: (
              <>
                <Facts
                  items={[
                    { label: t("Vai trò điều phối ESG"), value: governance.esgRole },
                    { label: t("Cơ chế xem xét của lãnh đạo"), value: governance.leadershipReview },
                  ]}
                />
                <Panel label={t("Nhận định theo hồ sơ")} text={governance.coordination.assessment} soft />
                <QuestionCards items={governance.coordination.items} />
                <Facts
                  items={[
                    { label: t("Các vấn đề được doanh nghiệp lựa chọn ưu tiên"), value: governance.priorities, full: true },
                  ]}
                />
              </>
            ),
          })
        : null}

      {hasIntegrity
        ? topic({
            id: "integrity",
            kicker: t("R04 / ĐẠO ĐỨC VÀ MINH BẠCH"),
            title: t("Liêm chính và cơ chế phản ánh"),
            intro: t(COPY.integrityIntro),
            tocKey: r04First === "integrity" ? "R04" : undefined,
            strip: strips.integrity,
            pillar: r04First === "integrity" ? { code: "G", label: t("Quản trị") } : undefined,
            children: (
              <>
                <QuestionCards items={governance.integrity.items} />
                <QuestionCards items={governance.integrityIncident ? [governance.integrityIncident] : []} />
                <Panel label={t("Nhận định theo hồ sơ")} text={governance.integrity.assessment} soft />
                <Note>{t(COPY.integrityNote)}</Note>
              </>
            ),
          })
        : null}

      {hasSupply
        ? topic({
            id: "supply",
            kicker: t("R04 / QUAN HỆ KINH DOANH"),
            title: t("Mua sắm và chuỗi cung ứng"),
            intro: t(COPY.supplyIntro),
            tocKey: r04First === "supply" ? "R04" : undefined,
            strip: strips.supply,
            pillar: r04First === "supply" ? { code: "G", label: t("Quản trị") } : undefined,
            children: (
              <>
                <Facts
                  items={[
                    { label: t("Phạm vi theo dõi"), value: profile.supplierGroupsText, full: true },
                  ]}
                />
                <Panel label={t("Nhận định theo hồ sơ")} text={governance.supply.assessment} soft />
                <QuestionCards items={governance.supply.items} />
                <DataTable
                  columns={[
                    { title: t("Nhóm nhà cung cấp"), width: "34%" },
                    { title: t("Tiêu chí, rủi ro được nêu"), width: "33%" },
                    { title: t("Cách xử lý được khai"), width: "33%" },
                  ]}
                  rows={profile.supplierGroups.map((group) => [group.name, group.risk, group.response])}
                />
                <Note>{t(COPY.supplyNote)}</Note>
              </>
            ),
          })
        : null}

      {hasData
        ? topic({
            id: "data",
            kicker: t("R04 / KIỂM SOÁT VÀ TÍNH LIÊN TỤC"),
            title: t("Dữ liệu và chất lượng thông tin"),
            intro: t(COPY.dataIntro),
            tocKey: r04First === "data" ? "R04" : undefined,
            strip: strips.data,
            pillar: r04First === "data" ? { code: "G", label: t("Quản trị") } : undefined,
            children: (
              <>
                <QuestionCards items={governance.data.items} />
                <Panel label={t("Nhận định theo hồ sơ")} text={governance.data.assessment} soft />
                <Note>{t(COPY.dataNote)}</Note>
              </>
            ),
          })
        : null}

      {model.modules.map((module, index) =>
        topic({
          id: `module-${module.source}`,
          kicker: t("R05 / NỘI DUNG THEO NGÀNH"),
          title: module.title,
          intro: t(moduleIntros[module.source] ?? ""),
          tocKey: index === 0 ? "R05" : undefined,
          strip: moduleStrips[module.source],
          children: (
            <>
              <Facts
                items={[
                  { label: t("Ngành, hoạt động được áp dụng"), value: module.scope },
                  { label: t("Cơ sở và giới hạn"), value: module.limits },
                ]}
              />
              <QuestionCards items={module.items} />
              <SubHead>{t("Nhận định theo hoạt động")}</SubHead>
              <Text style={styles.body}>
                {module.assessment ?? t("Chưa có đủ nội dung khai báo để nhận định.")}
              </Text>
              <Note>{t(COPY.moduleNote)}</Note>
            </>
          ),
        }),
      )}

      {hasGaps
        ? topic({
            id: "gaps",
            kicker: t("R06 / TỪ DỮ LIỆU ĐẾN HÀNH ĐỘNG"),
            title: t("Khoảng trống và ưu tiên cải thiện"),
            intro: t(COPY.gapsIntro),
            tocKey: r06First === "gaps" ? "R06" : undefined,
            strip: strips.gaps,
            children: (
              <>
                <DataTable
                  columns={[
                    { title: t("Vấn đề"), width: "24%" },
                    { title: t("Căn cứ"), width: "56%" },
                    { title: t("Gợi ý ưu tiên"), width: "20%" },
                  ]}
                  rows={improvement.gaps.map((gap) => [gap.title, gap.reason, gap.priority])}
                  splitRows
                />
                <BarChart title={t("Khoảng trống theo chủ đề")} data={charts.gapsByTopic} unit="" />
                <Panel label={t("Trọng tâm cho kỳ tiếp theo")} text={improvement.focus} breakable />
                <Panel label={t("Những việc cần xác minh thêm")} text={improvement.followups} breakable />
                <Note>{t(COPY.gapsNote)}</Note>
              </>
            ),
          })
        : null}

      {hasActions
        ? topic({
            id: "actions",
            kicker: t("R06 / LỘ TRÌNH CẢI THIỆN"),
            title: t("Kế hoạch hành động"),
            intro: t(COPY.actionsIntro),
            tocKey: r06First === "actions" ? "R06" : undefined,
            children: (
              <>
                {hasPlan ? (
                  <>
                    <PlanTimeline
                      steps={improvement.actions.map((action) => ({
                        label: action.description,
                        status: action.status,
                      }))}
                    />
                    <DataTable
                      columns={[
                        { title: t("Công việc"), width: "46%" },
                        { title: t("Phụ trách"), width: "16%" },
                        { title: t("Thời hạn"), width: "16%" },
                        { title: t("Trạng thái"), width: "22%" },
                      ]}
                      rows={improvement.actions.map((action) => [
                        action.description,
                        action.owner,
                        action.due,
                        action.status,
                      ])}
                      splitRows
                    />
                    {has(improvement.goal, improvement.resources, improvement.reviewCycle) ? (
                      <>
                        <SubHead>{t("Mục tiêu và cách theo dõi")}</SubHead>
                        <Facts
                          items={[
                            { label: t("Kết quả mong muốn"), value: improvement.goal, full: true },
                            { label: t("Nguồn lực"), value: improvement.resources, full: true },
                            { label: t("Chu kỳ xem xét"), value: improvement.reviewCycle, full: true },
                          ]}
                        />
                      </>
                    ) : null}
                    <Note>{t(COPY.actionsNote)}</Note>
                  </>
                ) : (
                  <Note>{t(COPY.actionsNoPlan)}</Note>
                )}
                {improvement.suggestions.length > 0 ? (
                  <>
                    <SubHead>{t(COPY.actionsSuggestTitle)}</SubHead>
                    <DataTable
                      columns={[
                        { title: t("Công việc và căn cứ"), width: "74%" },
                        { title: t("Gợi ý ưu tiên"), width: "26%" },
                      ]}
                      rows={improvement.suggestions.map((suggestion) => [
                        `${suggestion.text} (${suggestion.basis})`,
                        suggestion.priority,
                      ])}
                      splitRows
                    />
                    <Note>{t(COPY.actionsSuggestNote)}</Note>
                  </>
                ) : null}
              </>
            ),
          })
        : null}

      {evidenceGroups.length > 0
        ? topic({
            id: "images",
            kicker: t("R07 / CĂN CỨ TRỰC QUAN"),
            title: t("Hình ảnh và minh chứng chọn lọc"),
            intro: t(COPY.imagesIntro),
            tocKey: r07First === "images" ? "R07" : undefined,
            strip: strips.traceable,
            children: (
              <>
                {evidenceGroups.map((group) => {
                  const shown = group.files.filter((file) => imageCodes.has(file.code));
                  const others = group.files.filter((file) => !imageCodes.has(file.code));
                  return (
                    <Fragment key={group.questionId}>
                      <View style={{ marginTop: 12 }} wrap={false} minPresenceAhead={210}>
                        <Text style={styles.label}>{t("{id} • CÂU HỎI CÓ MINH CHỨNG", { id: group.questionId })}</Text>
                        <Text style={styles.h3}>{group.label}</Text>
                        <Text style={styles.body}>{group.text}</Text>
                        <Text style={[styles.cellMuted, { marginTop: 4 }]}>
                          {group.note !== null
                            ? t("Ghi chú của doanh nghiệp: {note}", { note: group.note })
                            : t(COPY.evidenceNoNote)}
                        </Text>
                      </View>
                      {shown.map((file) => {
                        const image = images.find((entry) => entry.code === file.code);
                        return image ? (
                          <View key={file.code} style={{ marginTop: 6 }} wrap={false}>
                            <View
                              style={{
                                height: 175,
                                backgroundColor: COLORS.panel,
                                justifyContent: "center",
                                alignItems: "center",
                                padding: 4,
                              }}
                            >
                              <Image src={image.src} style={{ maxHeight: 167, maxWidth: "100%", objectFit: "contain" }} />
                            </View>
                            <Text style={[styles.cellMuted, { marginTop: 3 }]}>
                              {t("{code} • Tệp: {fileName}", { code: image.code, fileName: image.fileName })}
                            </Text>
                          </View>
                        ) : null;
                      })}
                      {others.length > 0 ? (
                        <Text style={[styles.cellMuted, { marginTop: 4 }]}>
                          {t(COPY.evidenceOtherFiles)} {others.map((file) => `${file.code} (${file.name})`).join("; ")}
                        </Text>
                      ) : null}
                    </Fragment>
                  );
                })}
                <Note>{t(COPY.imagesNote)}</Note>
              </>
            ),
          })
        : null}

      {topic({
        id: "refs",
        kicker: t("R07 / TRUY XUẤT THÔNG TIN"),
        title: t("Danh mục căn cứ và giới hạn"),
        intro: t(COPY.evidenceIntro),
        tocKey: r07First === "refs" ? "R07" : undefined,
        strip: strips.traceable,
        children: (
          <>
            <DataTable
              columns={[
                { title: t("Mã căn cứ"), width: "14%" },
                { title: t("Nội dung, câu liên quan"), width: "46%" },
                { title: t("Kỳ, phạm vi"), width: "22%" },
                { title: t("Tình trạng"), width: "18%" },
              ]}
              rows={evidence.rows.map((row) => [row.id, row.description, row.scope, row.status])}
            />
            <Cols>
              <View style={{ width: "50%", paddingRight: 8 }}>
                <Panel label={t("Giới hạn dữ liệu")} text={evidence.limitations} />
              </View>
              <View style={{ width: "50%" }}>
                <Panel label={t("Tình trạng xác minh")} text={evidence.verificationStatement} soft />
              </View>
            </Cols>
            <Panel label={t("Tham chiếu công bố được phép")} text={evidence.permittedReferences} />
            <Note>{t(COPY.evidenceNote)}</Note>
          </>
        ),
      })}

      {topic({
        id: "appendix",
        kicker: t("R07 / CHI TIẾT HỒ SƠ"),
        title: t("Phụ lục câu trả lời"),
        intro: t(COPY.appendixIntro),
        strip: strips.appendix,
        children: (
          <>
            <DataTable
              columns={[
                { title: t("Mã câu"), width: "11%" },
                { title: t("Câu hỏi"), width: "39%" },
                { title: t("Câu trả lời"), width: "28%" },
                { title: t("Trạng thái căn cứ"), width: "22%" },
              ]}
              rows={appendix.rows.map((row) => [row.id, row.question, row.answer, row.evidence])}
              repeatHeader
            />
            <Panel label={t("Nội dung chưa khai báo trong phạm vi")} text={appendix.unansweredSummary} />
            <Note>{t(COPY.appendixNote)}</Note>
          </>
        ),
      })}

      {topic({
        id: "confirm",
        kicker: t("R07 / KIỂM SOÁT PHIÊN BẢN"),
        title: t("Xác nhận và thông tin phát hành"),
        intro: t(COPY.confirmIntro),
        strip: strips.confirm,
        children: (
          <>
            <Facts
              items={[
                { label: t("Đơn vị báo cáo"), value: meta.companyName },
                { label: t("Ngày phát hành"), value: meta.issuedAt },
                { label: t("Vai trò người xác nhận"), value: confirmation.role },
                { label: t("Mã hồ sơ / phiên bản"), value: `${meta.reportId} / ${meta.reportVersion}` },
                { label: t("Thời điểm xác nhận"), value: confirmation.confirmedAt },
                { label: t("Bộ câu hỏi / dữ liệu"), value: `${meta.contentVersion} / ${meta.answerVersion}` },
                { label: t("Trạng thái xác nhận"), value: confirmation.status },
              ]}
            />
            <SubHead>{t("Kênh truy xuất hồ sơ")}</SubHead>
            <Text style={styles.body}>{meta.reportReference}</Text>
            <Note>{t(COPY.confirmNote)}</Note>
            <Text style={[styles.h2, { marginTop: 24 }]}>ESG REPORT ONLINE</Text>
            <Text style={styles.body}>{t(COPY.closing)}</Text>
          </>
        ),
      })}
    </Document>
    </ReportThemeProvider>
    </ReportTextProvider>
  );
}

const PAGE_BOTTOM = 60;
