import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { ReportMetric, ReportModel } from "@esg/shared";
import type { ReactNode } from "react";

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
import { COLORS, styles } from "./theme";

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
  framework: { tag: "Khung tham chiếu", title: "Khung ESG và SDG" },
  summary: { tag: "Tổng quan", title: "Tóm tắt điều hành" },
  R01: { tag: "R01", title: "Hồ sơ và phạm vi" },
  R02: { tag: "R02", title: "Môi trường" },
  R03: { tag: "R03", title: "Người lao động và xã hội" },
  R04: { tag: "R04", title: "Quản trị" },
  R05: { tag: "R05", title: "Nội dung theo ngành" },
  R06: { tag: "R06", title: "Kế hoạch cải thiện" },
  R07: { tag: "R07", title: "Căn cứ, giới hạn và xác nhận" },
};

const FRAMEWORK_STRIP = [
  "Từ hoạt động đến thông tin và hành động",
  "Xác định phạm vi",
  "Thu thập dữ liệu",
  "Rà soát căn cứ",
  "Cải thiện",
] as const;

interface ReportDocumentProps {
  model: ReportModel;
  logo: ReportLogo | null;
  images: readonly EvidenceImage[];
  draftNotice: string | null;
  pages: Readonly<Partial<Record<TocKey, number>>>;
  onPage: (key: TocKey, pageNumber: number) => void;
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

function chunk<T>(list: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
}

function reportYear(period: string): string | null {
  const match = period.match(/(\d{4})\D*$/);
  return match?.[1] ?? null;
}

export function ReportDocument({
  model,
  logo,
  images,
  draftNotice,
  pages,
  onPage,
}: ReportDocumentProps) {
  const { meta, summary, profile, environment, social, governance, improvement, evidence, appendix, confirmation, charts } = model;
  const track = (key: TocKey) => (pageNumber: number) => onPage(key, pageNumber);
  const envPillar = charts.pillarStatus.find((row) => row.label === "Môi trường");
  const brand = meta.tradingName ?? meta.companyName;
  const year = reportYear(meta.period);
  const strips = COPY.strips;
  const moduleStrips: Record<string, readonly string[]> = COPY.strips;
  const moduleIntros: Record<string, string> = COPY.moduleIntros;
  const tocRows = TOC_KEYS.filter((key) => key !== "R05" || model.modules.length > 0);

  const topic = ({ id, kicker, title, intro, tocKey, strip, pillar, children }: TopicProps) => (
    <Page key={id} size="A4" style={[styles.page, { paddingBottom: strip ? 118 : PAGE_BOTTOM }]} wrap>
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

  const evidencePages = chunk(images, 2);
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
  const hasActions = has(improvement.actions.length > 0, improvement.goal, improvement.resources, improvement.reviewCycle);
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

  return (
    <Document title={`Báo cáo ESG ${meta.companyName}`} author="ESG Report Online" language="vi">
      <Page size="A4" style={[styles.page, { backgroundColor: COLORS.white, paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0 }]}>
        <View style={{ height: 840, paddingHorizontal: 64 }}>
          <View style={{ marginTop: 64, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 8, letterSpacing: 1.4, color: COLORS.muted, lineHeight: 1.3 }}>
              HỒ SƠ DOANH NGHIỆP
            </Text>
            {logo ? (
              <Image
                src={logo.src}
                style={{ width: Math.min(130, (logo.width / logo.height) * 44), height: 44, objectFit: "contain" }}
              />
            ) : null}
          </View>
          <View style={{ marginTop: 150 }}>
            <View style={{ width: 36, height: 3, backgroundColor: COLORS.ink }} />
            <Text style={{ fontSize: 40, fontWeight: 700, color: COLORS.ink, lineHeight: 1.15, marginTop: 22 }}>
              BÁO CÁO ESG
            </Text>
            {year ? (
              <Text style={{ fontSize: 28, color: COLORS.muted, lineHeight: 1.2, marginTop: 4 }}>{year}</Text>
            ) : null}
            <Text style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink, lineHeight: 1.35, marginTop: 44 }}>
              {meta.companyName}
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.muted, lineHeight: 1.4, marginTop: 10 }}>
              Môi trường • Xã hội • Quản trị
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.muted, lineHeight: 1.4, marginTop: 3 }}>
              Kỳ báo cáo {meta.period}
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
            <Text style={{ fontSize: 10, color: COLORS.ink, lineHeight: 1.5 }}>{COPY.coverTagline}</Text>
            <Text style={{ fontSize: 8, color: COLORS.muted, lineHeight: 1.5, marginTop: 4 }}>{COPY.coverNote}</Text>
            <Text style={{ fontSize: 8, fontWeight: 700, color: COLORS.ink, letterSpacing: 1.2, marginTop: 12 }}>
              ESG REPORT ONLINE
            </Text>
          </View>
        </View>
      </Page>

      {topic({
        id: "about",
        kicker: "VỀ BÁO CÁO NÀY",
        title: "Cách đọc và sử dụng báo cáo",
        intro: COPY.aboutIntro,
        strip: strips.pillars,
        children: (
          <>
            <Cols>
              <View style={{ width: "58%", paddingRight: 14 }}>
                <Panel label={COPY.basisTitle} text={COPY.basisBody} soft />
                <Panel label={COPY.layersTitle} text={COPY.layersBody} soft />
              </View>
              <View style={{ width: "42%" }}>
                <Facts
                  items={[
                    { label: "Mức khai báo", value: meta.disclosureLevel, full: true },
                    { label: "Phiên bản bộ câu hỏi", value: meta.contentVersion, full: true },
                    { label: "Phiên bản dữ liệu", value: meta.answerVersion, full: true },
                    { label: "Tình trạng rà soát", value: meta.reviewStatus, full: true },
                  ]}
                />
              </View>
            </Cols>
            <SubHead>Ý nghĩa của trạng thái</SubHead>
            <DataTable
              columns={[
                { title: "Trạng thái", width: "34%" },
                { title: "Cách đọc", width: "66%" },
              ]}
              rows={COPY.statusLegend.map((row) => [row[0], row[1]])}
            />
            <Note>{COPY.aboutNote}</Note>
            <Text style={[styles.body, { marginTop: 10, fontWeight: 700, color: COLORS.navy }]}>
              Trạng thái {meta.status}   |   Mã hồ sơ {meta.reportId}   |   Phát hành {meta.issuedAt}
            </Text>
          </>
        ),
      })}

      {topic({
        id: "toc",
        kicker: "BẢN ĐỒ NỘI DUNG",
        title: "Nội dung báo cáo",
        intro: COPY.tocIntro,
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
                      <Text style={styles.label}>{row.tag.toUpperCase()}</Text>
                      <Text style={[styles.body, { fontWeight: 700, color: COLORS.navy }]}>{row.title}</Text>
                    </View>
                    <Text style={[styles.body, { fontWeight: 700, color: COLORS.blue }]}>{pages[key] ?? ""}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ width: "46%" }}>
              <SubHead>Thông tin kiểm soát tài liệu</SubHead>
              <Facts
                items={[
                  { label: "Đơn vị báo cáo", value: meta.companyName, full: true },
                  { label: "Phạm vi địa lý", value: meta.countries, full: true },
                  { label: "Kỳ dữ liệu", value: meta.period, full: true },
                  { label: "Phiên bản báo cáo", value: meta.reportVersion, full: true },
                ]}
              />
              <Note>{COPY.tocNote}</Note>
            </View>
          </Cols>
        ),
      })}

      {topic({
        id: "framework",
        kicker: "KHUNG THAM CHIẾU",
        title: "Khung ESG và các mục tiêu SDG",
        intro: COPY.frameworkIntro,
        tocKey: "framework",
        strip: FRAMEWORK_STRIP,
        children: (
          <>
            <FrameworkRow
              code="E"
              title="Môi trường"
              text="Tài nguyên, vật liệu và tác động khí hậu."
              goals={[6, 7, 12, 13]}
            />
            <FrameworkRow
              code="S"
              title="Xã hội"
              text="Điều kiện làm việc, sức khỏe và phát triển con người."
              goals={[3, 4, 5, 8]}
            />
            <FrameworkRow
              code="G"
              title="Quản trị"
              text="Liêm chính, trách nhiệm và quan hệ hợp tác."
              goals={[16, 17]}
            />
            <Note>{COPY.frameworkPillars}</Note>
            <Note>{COPY.frameworkNote}</Note>
            <Note>{COPY.frameworkSource}</Note>
            <Note>{COPY.frameworkDisclaimer}</Note>
          </>
        ),
      })}

      {topic({
        id: "summary",
        kicker: "TỔNG QUAN TRONG KỲ",
        title: "Tóm tắt điều hành",
        intro: COPY.summaryIntro,
        tocKey: "summary",
        strip: strips.pillars,
        children: (
          <>
            {draftNotice ? <Panel label="Bản nháp" text={draftNotice} /> : null}
            <Kpis
              items={[
                { label: "Khai báo hợp lệ", value: String(summary.answeredCount) },
                { label: "Tài liệu đã đính kèm", value: String(summary.evidenceCount) },
                { label: "Nội dung cần bổ sung", value: String(summary.openItemsCount) },
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
                    <Text style={styles.label}>ƯU TIÊN ĐƯỢC GHI NHẬN</Text>
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
            <Note>{COPY.summaryNote}</Note>
            {summary.priorities.length > 0 ? <Note>{COPY.prioritiesNote}</Note> : null}
          </>
        ),
      })}

      {topic({
        id: "profile",
        kicker: "R01 / NHẬN DIỆN",
        title: "Hồ sơ doanh nghiệp",
        intro: COPY.profileIntro,
        tocKey: "R01",
        strip: strips.profile,
        children: (
          <>
            <Facts
              items={[
                { label: "Tên pháp lý", value: meta.companyName },
                { label: "Tên giao dịch", value: meta.tradingName },
                { label: "Mã số doanh nghiệp", value: meta.registrationId },
                { label: "Loại hình pháp lý", value: meta.legalForm },
              ]}
            />
            <Panel label="Nhận định theo hồ sơ" text={profile.orgContext} soft />
            <Facts
              items={[
                { label: "Ngành chính", value: profile.primarySector },
                { label: "Ngành bổ sung", value: profile.secondarySectors },
                { label: "Nhóm quy mô nhân sự", value: profile.sizeBand },
                { label: "Hoạt động chính", value: profile.activities },
              ]}
            />
          </>
        ),
      })}

      {topic({
        id: "scope",
        kicker: "R01 / CƠ SỞ LẬP HỒ SƠ",
        title: "Phạm vi và ranh giới dữ liệu",
        intro: COPY.scopeIntro,
        strip: strips.scope,
        children: (
          <>
            <Facts
              items={[
                { label: "Kỳ báo cáo", value: meta.period },
                { label: "Hoạt động đặc thù", value: profile.capabilities },
                { label: "Quốc gia, vùng hoạt động", value: meta.countries },
                { label: "Có người lao động trong kỳ", value: profile.employeesPresence },
                { label: "Cơ sở trong phạm vi", value: profile.sites.length > 0 ? profile.sites.map((site) => site.name).join("; ") : null },
                { label: "Nhà thầu và lao động thuê ngoài", value: profile.contractorPresence },
              ]}
            />
            {profile.sites.length > 0 ? (
              <View>
                <SubHead>Danh mục cơ sở</SubHead>
                <DataTable
                  columns={[
                    { title: "Cơ sở", width: "34%" },
                    { title: "Hoạt động được tính", width: "33%" },
                    { title: "Giới hạn", width: "33%" },
                  ]}
                  rows={profile.sites.map((site) => [site.name, site.scope, site.limit])}
                />
              </View>
            ) : null}
            <Panel label="Giới hạn phạm vi" text={profile.scopeLimitations} soft />
            <Note>{COPY.scopeNote}</Note>
          </>
        ),
      })}

      {hasValueChain
        ? topic({
            id: "value-chain",
            kicker: "R01 / BỐI CẢNH KINH DOANH",
            title: "Hoạt động và chuỗi giá trị",
            intro: COPY.valueChainIntro,
            strip: strips.valueChain,
            children: (
              <>
                <Facts
                  items={[
                    { label: "Sản phẩm, dịch vụ chính", value: profile.products },
                    { label: "Nhóm nhà cung cấp quan trọng", value: profile.supplierGroupsText },
                    { label: "Thị trường và nhóm khách hàng", value: profile.markets },
                    { label: "Nhóm đối tác đầu ra", value: profile.downstreamGroupsText },
                    { label: "Khoảng doanh thu tự nguyện", value: profile.revenueBand, full: true },
                  ]}
                />
                {charts.supplyChain ? (
                  <SupplyChainFlow
                    suppliers={charts.supplyChain.suppliers}
                    downstream={charts.supplyChain.downstream}
                    company={meta.companyName}
                  />
                ) : null}
                <Panel label="Nhận định theo hồ sơ" text={profile.valueChainContext} soft />
                <Note>{COPY.valueChainNote}</Note>
              </>
            ),
          })
        : null}

      {topic({
        id: "env-overview",
        kicker: "R02 / MÔI TRƯỜNG",
        title: "Tổng quan môi trường",
        intro: COPY.envIntro,
        tocKey: r02First === "overview" ? "R02" : undefined,
        strip: strips.env,
        pillar: { code: "E", label: "Môi trường" },
        children: (
          <>
            <Kpis
              items={[
                { label: "Điện sử dụng", value: value(environment.electricity) },
                { label: "Nước sử dụng", value: value(environment.water) },
                { label: "Dữ liệu phát thải", value: environment.ghgStatus },
              ]}
            />
            {envPillar ? <PillarChart data={[envPillar]} /> : null}
            <Cols>
              <View style={{ width: "50%", paddingRight: 8 }}>
                <Panel label="Nhận định theo hồ sơ" text={environment.overviewAssessment} soft />
              </View>
              <View style={{ width: "50%" }}>
                <Panel label="Những nội dung cần làm rõ" text={environment.overviewGaps} />
              </View>
            </Cols>
          </>
        ),
      })}

      {hasEnergy
        ? topic({
            id: "energy",
            kicker: "R02 / NĂNG LƯỢNG",
            title: "Năng lượng và sử dụng hiệu quả",
            intro: COPY.energyIntro,
            strip: strips.energy,
            children: (
              <>
                <Facts
                  items={[
                    { label: "Điện tiêu thụ trong kỳ", value: value(environment.electricity) },
                    { label: "Nguồn, cách tổng hợp", value: environment.electricity?.source ?? null },
                    { label: "Nhiên liệu", value: value(environment.fuel) },
                    { label: "Nguồn nhiên liệu", value: environment.fuel?.source ?? null },
                  ]}
                />
                <QuestionCards items={environment.energy.items} />
                <Panel label="Nhận định theo hồ sơ" text={environment.energy.assessment} soft />
              </>
            ),
          })
        : null}

      {hasGhg
        ? topic({
            id: "ghg",
            kicker: "R02 / PHẦN KHAI BÁO MỞ RỘNG",
            title: "Khí nhà kính và rủi ro khí hậu",
            intro: COPY.ghgIntro,
            strip: strips.ghg,
            children: (
              <>
                <DataTable
                  columns={[
                    { title: "Chỉ số", width: "34%" },
                    { title: "Giá trị", width: "33%" },
                    { title: "Phạm vi", width: "33%" },
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
                        { label: "Phương pháp và ranh giới", value: environment.ghgMethod, full: true },
                        { label: "Nguồn tính, hệ số được sử dụng", value: environment.ghgSources, full: true },
                      ]}
                    />
                  </View>
                  <View style={{ width: "45%" }}>
                    <Panel label="Nhận định theo hồ sơ" text={environment.climate.assessment} soft />
                  </View>
                </Cols>
                <BarChart title="Phát thải trong phạm vi" data={charts.ghg} unit="tCO₂e" />
                <QuestionCards items={environment.climate.items} />
              </>
            ),
          })
        : null}

      {hasWater
        ? topic({
            id: "water",
            kicker: "R02 / TÀI NGUYÊN NƯỚC",
            title: "Nước và nước thải",
            intro: COPY.waterIntro,
            strip: strips.water,
            children: (
              <>
                <Facts
                  items={[
                    { label: "Nước sử dụng", value: value(environment.water) },
                    { label: "Phạm vi và nguồn số liệu", value: environment.water?.source ?? null },
                    { label: "Cách thu gom, xử lý nước thải", value: value(environment.wastewater), full: true },
                  ]}
                />
                <Panel label="Nhận định theo hồ sơ" text={environment.waterSection.assessment} soft />
                <QuestionCards items={environment.waterSection.items} />
              </>
            ),
          })
        : null}

      {hasWaste
        ? topic({
            id: "waste",
            kicker: "R02 / CHẤT THẢI",
            title: "Chất thải và quản lý dòng thải",
            intro: COPY.wasteIntro,
            strip: strips.waste,
            children: (
              <>
                <Facts
                  items={[
                    { label: "Không nguy hại", value: value(environment.wasteNonHazardous) },
                    { label: "Nguy hại", value: value(environment.wasteHazardous) },
                    { label: "Nguồn số liệu không nguy hại", value: environment.wasteNonHazardous?.source ?? null },
                    { label: "Nguồn số liệu nguy hại", value: environment.wasteHazardous?.source ?? null },
                  ]}
                />
                <BarChart title="Chất thải" data={charts.waste} unit="tấn" />
                <QuestionCards items={environment.waste.items} />
                <Panel label="Nhận định theo hồ sơ" text={environment.waste.assessment} soft />
              </>
            ),
          })
        : null}

      {hasMaterials
        ? topic({
            id: "materials",
            kicker: "R02 / CÁC TÁC ĐỘNG LIÊN QUAN",
            title: "Vật liệu và tác động tại cơ sở",
            intro: COPY.materialsIntro,
            strip: strips.materials,
            children: (
              <>
                <QuestionCards items={environment.materials.items} />
                <Panel label="Nhận định theo hồ sơ" text={environment.materials.assessment} soft />
              </>
            ),
          })
        : null}

      {hasIncident
        ? topic({
            id: "incident",
            kicker: "R02 / THEO DÕI VÀ CẢI THIỆN",
            title: "Sự cố và mục tiêu môi trường",
            intro: COPY.incidentIntro,
            strip: strips.incident,
            children: (
              <>
                <QuestionCards items={environment.incident ? [environment.incident] : []} />
                <SubHead>Mục tiêu môi trường</SubHead>
                <QuestionCards items={environment.targets.items} />
                <Panel label="Nhận định theo hồ sơ" text={environment.targets.assessment} soft />
              </>
            ),
          })
        : null}

      {hasWorkforce
        ? topic({
            id: "workforce",
            kicker: "R03 / NGƯỜI LAO ĐỘNG VÀ XÃ HỘI",
            title: "Con người và điều kiện làm việc",
            intro: COPY.workforceIntro,
            tocKey: r03First === "workforce" ? "R03" : undefined,
            strip: strips.workforce,
            pillar: { code: "S", label: "Xã hội" },
            children: (
              <>
                <Kpis items={[{ label: "Người lao động cuối kỳ", value: value(social.headcount) }]} />
                <Facts
                  items={[
                    { label: "Phạm vi người lao động", value: social.workerScope, full: true },
                    { label: "Cơ cấu lao động", value: value(social.workforceTable), full: true },
                  ]}
                />
                <QuestionCards items={social.workforce.items} />
                <Panel label="Nhận định theo hồ sơ" text={social.workforce.assessment} soft />
              </>
            ),
          })
        : null}

      {hasSafety
        ? topic({
            id: "safety",
            kicker: "R03 / MÔI TRƯỜNG LÀM VIỆC",
            title: "An toàn và sức khỏe nghề nghiệp",
            intro: COPY.safetyIntro,
            tocKey: r03First === "safety" ? "R03" : undefined,
            strip: strips.safety,
            pillar: r03First === "safety" ? { code: "S", label: "Xã hội" } : undefined,
            children: (
              <>
                <Kpis
                  items={[
                    { label: "Tai nạn lao động trong kỳ", value: value(social.accidents) },
                    { label: "Tử vong liên quan công việc", value: value(social.fatalities) },
                  ]}
                />
                <QuestionCards items={social.safety.items} />
                <Panel label="Nhận định theo hồ sơ" text={social.safety.assessment} soft />
              </>
            ),
          })
        : null}

      {hasLabour
        ? topic({
            id: "labour",
            kicker: "R03 / ĐỐI XỬ CÓ TRÁCH NHIỆM",
            title: "Quyền lao động và đối thoại",
            intro: COPY.labourIntro,
            tocKey: r03First === "labour" ? "R03" : undefined,
            strip: strips.labour,
            pillar: r03First === "labour" ? { code: "S", label: "Xã hội" } : undefined,
            children: (
              <>
                <QuestionCards items={social.labour.items} />
                <Panel label="Nhận định theo hồ sơ" text={social.labour.assessment} soft />
                <Note>{COPY.labourNote}</Note>
              </>
            ),
          })
        : null}

      {hasCommunity
        ? topic({
            id: "community",
            kicker: "R03 / ĐÀO TẠO VÀ QUAN HỆ XÃ HỘI",
            title: "Năng lực và quan hệ với các bên",
            intro: COPY.communityIntro,
            tocKey: r03First === "community" ? "R03" : undefined,
            strip: strips.community,
            pillar: r03First === "community" ? { code: "S", label: "Xã hội" } : undefined,
            children: (
              <>
                <Facts
                  items={[
                    { label: "Tổng thời lượng đào tạo", value: value(social.trainingHours) },
                    { label: "Nguồn tổng hợp", value: social.trainingHours?.source ?? null },
                  ]}
                />
                <Panel label="Nhận định theo hồ sơ" text={social.community.assessment} soft />
                <QuestionCards items={social.community.items} />
              </>
            ),
          })
        : null}

      {hasGovernance
        ? topic({
            id: "governance",
            kicker: "R04 / QUẢN TRỊ",
            title: "Trách nhiệm và điều phối ESG",
            intro: COPY.governanceIntro,
            tocKey: r04First === "governance" ? "R04" : undefined,
            strip: strips.governance,
            pillar: { code: "G", label: "Quản trị" },
            children: (
              <>
                <Facts
                  items={[
                    { label: "Vai trò điều phối ESG", value: governance.esgRole },
                    { label: "Cơ chế xem xét của lãnh đạo", value: governance.leadershipReview },
                  ]}
                />
                <Panel label="Nhận định theo hồ sơ" text={governance.coordination.assessment} soft />
                <QuestionCards items={governance.coordination.items} />
                <Facts
                  items={[
                    { label: "Các vấn đề được doanh nghiệp lựa chọn ưu tiên", value: governance.priorities, full: true },
                  ]}
                />
              </>
            ),
          })
        : null}

      {hasIntegrity
        ? topic({
            id: "integrity",
            kicker: "R04 / ĐẠO ĐỨC VÀ MINH BẠCH",
            title: "Liêm chính và cơ chế phản ánh",
            intro: COPY.integrityIntro,
            tocKey: r04First === "integrity" ? "R04" : undefined,
            strip: strips.integrity,
            pillar: r04First === "integrity" ? { code: "G", label: "Quản trị" } : undefined,
            children: (
              <>
                <QuestionCards items={governance.integrity.items} />
                <QuestionCards items={governance.integrityIncident ? [governance.integrityIncident] : []} />
                <Panel label="Nhận định theo hồ sơ" text={governance.integrity.assessment} soft />
                <Note>{COPY.integrityNote}</Note>
              </>
            ),
          })
        : null}

      {hasSupply
        ? topic({
            id: "supply",
            kicker: "R04 / QUAN HỆ KINH DOANH",
            title: "Mua sắm và chuỗi cung ứng",
            intro: COPY.supplyIntro,
            tocKey: r04First === "supply" ? "R04" : undefined,
            strip: strips.supply,
            pillar: r04First === "supply" ? { code: "G", label: "Quản trị" } : undefined,
            children: (
              <>
                <Facts
                  items={[
                    { label: "Phạm vi theo dõi", value: profile.supplierGroupsText, full: true },
                  ]}
                />
                <Panel label="Nhận định theo hồ sơ" text={governance.supply.assessment} soft />
                <QuestionCards items={governance.supply.items} />
                <DataTable
                  columns={[
                    { title: "Nhóm nhà cung cấp", width: "34%" },
                    { title: "Tiêu chí, rủi ro được nêu", width: "33%" },
                    { title: "Cách xử lý được khai", width: "33%" },
                  ]}
                  rows={profile.supplierGroups.map((group) => [group.name, group.risk, group.response])}
                />
                <Note>{COPY.supplyNote}</Note>
              </>
            ),
          })
        : null}

      {hasData
        ? topic({
            id: "data",
            kicker: "R04 / KIỂM SOÁT VÀ TÍNH LIÊN TỤC",
            title: "Dữ liệu và chất lượng thông tin",
            intro: COPY.dataIntro,
            tocKey: r04First === "data" ? "R04" : undefined,
            strip: strips.data,
            pillar: r04First === "data" ? { code: "G", label: "Quản trị" } : undefined,
            children: (
              <>
                <QuestionCards items={governance.data.items} />
                <Panel label="Nhận định theo hồ sơ" text={governance.data.assessment} soft />
                <Note>{COPY.dataNote}</Note>
              </>
            ),
          })
        : null}

      {model.modules.map((module, index) =>
        topic({
          id: `module-${module.source}`,
          kicker: "R05 / NỘI DUNG THEO NGÀNH",
          title: module.title,
          intro: moduleIntros[module.source],
          tocKey: index === 0 ? "R05" : undefined,
          strip: moduleStrips[module.source],
          children: (
            <>
              <Facts
                items={[
                  { label: "Ngành, hoạt động được áp dụng", value: module.scope },
                  { label: "Cơ sở và giới hạn", value: module.limits },
                ]}
              />
              <QuestionCards items={module.items} />
              <SubHead>Nhận định theo hoạt động</SubHead>
              <Text style={styles.body}>
                {module.assessment ?? "Chưa có đủ nội dung khai báo để nhận định."}
              </Text>
              <Note>{COPY.moduleNote}</Note>
            </>
          ),
        }),
      )}

      {hasGaps
        ? topic({
            id: "gaps",
            kicker: "R06 / TỪ DỮ LIỆU ĐẾN HÀNH ĐỘNG",
            title: "Khoảng trống và ưu tiên cải thiện",
            intro: COPY.gapsIntro,
            tocKey: r06First === "gaps" ? "R06" : undefined,
            strip: strips.gaps,
            children: (
              <>
                <DataTable
                  columns={[
                    { title: "Vấn đề", width: "30%" },
                    { title: "Căn cứ", width: "40%" },
                    { title: "Ưu tiên đã chọn", width: "30%" },
                  ]}
                  rows={improvement.gaps.map((gap) => [gap.title, gap.reason, gap.priority])}
                />
                <BarChart title="Khoảng trống theo chủ đề" data={charts.gapsByTopic} unit="" />
                <Cols>
                  <View style={{ width: "50%", paddingRight: 8 }}>
                    <Panel label="Những việc cần xác minh thêm" text={improvement.followups} />
                  </View>
                  <View style={{ width: "50%" }}>
                    <Panel label="Trọng tâm cho kỳ tiếp theo" text={improvement.focus} />
                  </View>
                </Cols>
                <Note>{COPY.gapsNote}</Note>
              </>
            ),
          })
        : null}

      {hasActions
        ? topic({
            id: "actions",
            kicker: "R06 / LỘ TRÌNH CẢI THIỆN",
            title: "Kế hoạch hành động",
            intro: COPY.actionsIntro,
            tocKey: r06First === "actions" ? "R06" : undefined,
            strip: strips.actions,
            children: (
              <>
                <DataTable
                  columns={[
                    { title: "Công việc và căn cứ", width: "46%" },
                    { title: "Phụ trách", width: "16%" },
                    { title: "Thời hạn", width: "16%" },
                    { title: "Trạng thái", width: "22%" },
                  ]}
                  rows={improvement.actions.map((action) => [
                    action.description,
                    action.owner,
                    action.due,
                    action.status,
                  ])}
                />
                <SubHead>Mục tiêu và cách theo dõi</SubHead>
                <Facts
                  items={[
                    { label: "Kết quả mong muốn", value: improvement.goal, full: true },
                    { label: "Nguồn lực được xác nhận", value: improvement.resources },
                    { label: "Chu kỳ xem xét", value: improvement.reviewCycle },
                  ]}
                />
                <Note>{COPY.actionsNote}</Note>
              </>
            ),
          })
        : null}

      {evidencePages.map((group, pageIndex) =>
        topic({
          id: `images-${pageIndex}`,
          kicker: pageIndex === 0 ? "R07 / CĂN CỨ TRỰC QUAN" : "R07 / HỒ SƠ MINH CHỨNG",
          title: pageIndex === 0 ? "Hình ảnh và minh chứng chọn lọc" : "Tài liệu tham chiếu trong kỳ",
          intro: pageIndex === 0 ? COPY.imagesIntro : COPY.evidenceRefsIntro,
          tocKey: pageIndex === 0 && r07First === "images" ? "R07" : undefined,
          strip: strips.traceable,
          children: (
            <>
              {group.map((image) => (
                <View key={image.code} style={{ marginTop: 10 }} wrap={false}>
                  <View
                    style={{
                      height: 185,
                      backgroundColor: COLORS.panel,
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 4,
                    }}
                  >
                    <Image src={image.src} style={{ maxHeight: 177, maxWidth: "100%", objectFit: "contain" }} />
                  </View>
                  <Text style={[styles.cellMuted, { marginTop: 3 }]}>
                    {image.code} • {image.caption}
                  </Text>
                </View>
              ))}
              {pageIndex === 0 ? <Note>{COPY.imagesNote}</Note> : null}
            </>
          ),
        }),
      )}

      {topic({
        id: "refs",
        kicker: "R07 / TRUY XUẤT THÔNG TIN",
        title: "Danh mục căn cứ và giới hạn",
        intro: COPY.evidenceIntro,
        tocKey: r07First === "refs" ? "R07" : undefined,
        strip: strips.traceable,
        children: (
          <>
            <DataTable
              columns={[
                { title: "Mã căn cứ", width: "14%" },
                { title: "Nội dung, câu liên quan", width: "46%" },
                { title: "Kỳ, phạm vi", width: "22%" },
                { title: "Tình trạng", width: "18%" },
              ]}
              rows={evidence.rows.map((row) => [row.id, row.description, row.scope, row.status])}
            />
            <Cols>
              <View style={{ width: "50%", paddingRight: 8 }}>
                <Panel label="Giới hạn dữ liệu" text={evidence.limitations} />
              </View>
              <View style={{ width: "50%" }}>
                <Panel label="Tình trạng xác minh" text={evidence.verificationStatement} soft />
              </View>
            </Cols>
            <Panel label="Tham chiếu công bố được phép" text={evidence.permittedReferences} />
            <Note>{COPY.evidenceNote}</Note>
          </>
        ),
      })}

      {topic({
        id: "appendix",
        kicker: "R07 / CHI TIẾT HỒ SƠ",
        title: "Phụ lục câu trả lời",
        intro: COPY.appendixIntro,
        strip: strips.appendix,
        children: (
          <>
            <DataTable
              columns={[
                { title: "Mã câu", width: "12%" },
                { title: "Nội dung và câu trả lời", width: "58%" },
                { title: "Trạng thái căn cứ", width: "30%" },
              ]}
              rows={appendix.rows.map((row) => [row.id, row.text, row.evidence])}
            />
            <Panel label="Nội dung chưa khai báo trong phạm vi" text={appendix.unansweredSummary} />
            <Note>{COPY.appendixNote}</Note>
          </>
        ),
      })}

      {topic({
        id: "confirm",
        kicker: "R07 / KIỂM SOÁT PHIÊN BẢN",
        title: "Xác nhận và thông tin phát hành",
        intro: COPY.confirmIntro,
        strip: strips.confirm,
        children: (
          <>
            <Facts
              items={[
                { label: "Đơn vị báo cáo", value: meta.companyName },
                { label: "Ngày phát hành", value: meta.issuedAt },
                { label: "Vai trò người xác nhận", value: confirmation.role },
                { label: "Mã hồ sơ / phiên bản", value: `${meta.reportId} / ${meta.reportVersion}` },
                { label: "Thời điểm xác nhận", value: confirmation.confirmedAt },
                { label: "Bộ câu hỏi / dữ liệu", value: `${meta.contentVersion} / ${meta.answerVersion}` },
                { label: "Trạng thái xác nhận", value: confirmation.status },
              ]}
            />
            <SubHead>Kênh truy xuất hồ sơ</SubHead>
            <Text style={styles.body}>{meta.reportReference}</Text>
            <Note>{COPY.confirmNote}</Note>
            <Text style={[styles.h2, { marginTop: 24 }]}>ESG REPORT ONLINE</Text>
            <Text style={styles.body}>{COPY.closing}</Text>
          </>
        ),
      })}
    </Document>
  );
}

const PAGE_BOTTOM = 60;
