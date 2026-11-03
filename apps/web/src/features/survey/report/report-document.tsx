import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { ReportMetric, ReportModel } from "@esg/shared";

import { COPY } from "./copy";
import {
  BarChart,
  Cols,
  DataTable,
  EvidenceGallery,
  Facts,
  ItemList,
  Kpis,
  Note,
  Panel,
  PillarChart,
  PracticeChart,
  SectionHead,
  SubHead,
  SupplyChainFlow,
  metricText,
} from "./pdf-parts";
import type { EvidenceImage } from "./pdf-parts";
import type { ReportLogo } from "./report-logo";
import { COLORS, styles } from "./theme";

export const TOC_KEYS = ["summary", "R01", "R02", "R03", "R04", "R05", "R06", "R07"] as const;
export type TocKey = (typeof TOC_KEYS)[number];

const TOC_TITLES: Record<TocKey, string> = {
  summary: "Tổng quan — Tóm tắt điều hành",
  R01: "R01 — Hồ sơ và phạm vi",
  R02: "R02 — Môi trường",
  R03: "R03 — Người lao động và xã hội",
  R04: "R04 — Quản trị",
  R05: "R05 — Nội dung theo ngành",
  R06: "R06 — Kế hoạch cải thiện",
  R07: "R07 — Căn cứ, giới hạn và xác nhận",
};

interface ReportDocumentProps {
  model: ReportModel;
  logo: ReportLogo | null;
  images: readonly EvidenceImage[];
  draftNotice: string | null;
  pages: Readonly<Partial<Record<TocKey, number>>>;
  onPage: (key: TocKey, pageNumber: number) => void;
}

function value(metric: ReportMetric | null): string | null {
  return metricText(metric);
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
  const tocRows = TOC_KEYS.filter((key) => key !== "R05" || model.modules.length > 0);

  return (
    <Document title={`Báo cáo ESG ${meta.companyName}`} author="ESG Report Online" language="vi">
      <Page size="A4" style={[styles.page, { paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0 }]}>
        <View style={{ backgroundColor: COLORS.navy, height: 835 }}>
          <View style={{ paddingHorizontal: 54, paddingTop: 60 }}>
            <Text style={{ fontSize: 8, letterSpacing: 1.2, color: "#8FA4C8", lineHeight: 1.3 }}>
              HỒ SƠ DOANH NGHIỆP
            </Text>
            <Text style={{ fontSize: 34, fontWeight: 700, color: COLORS.white, lineHeight: 1.2, marginTop: 8 }}>
              BÁO CÁO ESG
            </Text>
            {logo ? (
              <View style={{ marginTop: 28, backgroundColor: COLORS.white, padding: 10, alignSelf: "flex-start" }}>
                <Image
                  src={logo.src}
                  style={{ width: Math.min(150, (logo.width / logo.height) * 48), height: 48, objectFit: "contain" }}
                />
              </View>
            ) : null}
            <Text style={{ fontSize: 20, fontWeight: 700, color: COLORS.white, lineHeight: 1.3, marginTop: 36 }}>
              {meta.companyName}
            </Text>
            <Text style={{ fontSize: 10, color: "#B8C4DA", lineHeight: 1.4, marginTop: 8 }}>
              Môi trường · Xã hội · Quản trị
            </Text>
            <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.white, lineHeight: 1.4, marginTop: 14 }}>
              Kỳ báo cáo {meta.period}
            </Text>
          </View>

          <View
            style={{
              marginTop: 150,
              marginHorizontal: 54,
              backgroundColor: "#173560",
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 7, color: "#8FA4C8", letterSpacing: 0.8, lineHeight: 1.3 }}>TRẠNG THÁI</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.white, lineHeight: 1.4, marginBottom: 8 }}>
                {meta.status}
              </Text>
              <Text style={{ fontSize: 7, color: "#8FA4C8", letterSpacing: 0.8, lineHeight: 1.3 }}>NGÀY PHÁT HÀNH</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.white, lineHeight: 1.4 }}>{meta.issuedAt}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: "#8FA4C8", letterSpacing: 0.8, lineHeight: 1.3 }}>MÃ HỒ SƠ</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.white, lineHeight: 1.4 }}>{meta.reportId}</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 54, marginTop: 40 }}>
            <Text style={{ fontSize: 11, color: COLORS.white, lineHeight: 1.5 }}>{COPY.coverTagline}</Text>
            <Text style={{ fontSize: 8, color: "#8FA4C8", lineHeight: 1.5, marginTop: 6 }}>{COPY.coverNote}</Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.headerBrand}>ESG REPORT ONLINE</Text>
          {meta.isDraft ? <Text style={styles.headerDraft}>BẢN NHÁP</Text> : null}
        </View>
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {meta.companyName} • {meta.reportId}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Trang ${pageNumber} / ${totalPages}`}
          />
        </View>

        <Text style={styles.kicker}>VỀ BÁO CÁO NÀY</Text>
        <Text style={styles.h1}>Cách đọc và sử dụng báo cáo</Text>
        <Text style={styles.intro}>{COPY.aboutIntro}</Text>
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
        <Note>{COPY.aboutNote}</Note>

        <Text style={[styles.kicker, { marginTop: 28 }]}>BẢN ĐỒ NỘI DUNG</Text>
        <Text style={styles.h1}>Nội dung báo cáo</Text>
        <Text style={styles.intro}>{COPY.tocIntro}</Text>
        <View wrap={false}>
          {tocRows.map((key) => (
            <View
              key={key}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderBottomWidth: 0.5,
                borderBottomColor: COLORS.line,
                paddingVertical: 5,
              }}
            >
              <Text style={styles.body}>{TOC_TITLES[key]}</Text>
              <Text style={[styles.body, { fontWeight: 700 }]}>{pages[key] ?? ""}</Text>
            </View>
          ))}
        </View>
        <Facts
          items={[
            { label: "Đơn vị báo cáo", value: meta.companyName },
            { label: "Phạm vi địa lý", value: meta.countries },
            { label: "Kỳ dữ liệu", value: meta.period },
            { label: "Phiên bản báo cáo", value: meta.reportVersion },
          ]}
        />
        <Note>{COPY.tocNote}</Note>

        <SectionHead
          breakBefore
          kicker="TỔNG QUAN TRONG KỲ"
          title="Tóm tắt điều hành"
          intro={COPY.summaryIntro}
          onPage={track("summary")}
        />
        {draftNotice ? <Panel label="Bản nháp" text={draftNotice} /> : null}
        <Kpis
          items={[
            { label: "Khai báo hợp lệ", value: String(summary.answeredCount) },
            { label: "Tài liệu đã đính kèm", value: String(summary.evidenceCount) },
            { label: "Nội dung cần bổ sung", value: String(summary.openItemsCount) },
          ]}
        />
        <Panel label="Nhận định theo hồ sơ" text={summary.executiveSummary} soft />
        <PracticeChart data={charts.practiceStatus} />
        <PillarChart data={charts.pillarStatus} />
        {summary.priorities.length > 0 ? (
          <View style={styles.panel} wrap={false}>
            <Text style={styles.label}>GỢI Ý ƯU TIÊN TỪ KHOẢNG TRỐNG</Text>
            {summary.priorities.map((priority, index) => (
              <Text key={index} style={[styles.body, { marginTop: 3 }]}>
                {String(index + 1).padStart(2, "0")}  {priority}
              </Text>
            ))}
          </View>
        ) : null}
        <Note>{COPY.summaryNote}</Note>
        {summary.priorities.length > 0 ? <Note>{COPY.prioritiesNote}</Note> : null}

        <SectionHead
          breakBefore
          kicker="R01 / NHẬN DIỆN"
          title="Hồ sơ doanh nghiệp"
          intro={COPY.profileIntro}
          onPage={track("R01")}
        />
        <Facts
          items={[
            { label: "Tên pháp lý", value: meta.companyName },
            { label: "Tên giao dịch", value: meta.tradingName },
            { label: "Mã số doanh nghiệp", value: meta.registrationId },
            { label: "Loại hình pháp lý", value: meta.legalForm },
            { label: "Ngành chính", value: profile.primarySector },
            { label: "Ngành bổ sung", value: profile.secondarySectors },
            { label: "Nhóm quy mô nhân sự", value: profile.sizeBand },
            { label: "Hoạt động chính", value: profile.activities },
          ]}
        />
        <Panel label="Nhận định theo hồ sơ" text={profile.orgContext} soft />

        <SectionHead
          kicker="R01 / CƠ SỞ LẬP HỒ SƠ"
          title="Phạm vi và ranh giới dữ liệu"
          intro={COPY.scopeIntro}
        />
        <Facts
          items={[
            { label: "Kỳ báo cáo", value: meta.period },
            { label: "Quốc gia, vùng hoạt động", value: meta.countries },
            { label: "Hoạt động đặc thù", value: profile.capabilities },
            { label: "Có người lao động trong kỳ", value: profile.employeesPresence },
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
        <Panel label="Giới hạn phạm vi" text={profile.scopeLimitations} />
        <Note>{COPY.scopeNote}</Note>

        {profile.products !== null ||
        profile.markets !== null ||
        profile.revenueBand !== null ||
        charts.supplyChain !== null ? (
          <View>
            <SectionHead
              kicker="R01 / BỐI CẢNH KINH DOANH"
              title="Hoạt động và chuỗi giá trị"
              intro={COPY.valueChainIntro}
            />
            <Facts
              items={[
                { label: "Sản phẩm, dịch vụ chính", value: profile.products, full: true },
                { label: "Thị trường và nhóm khách hàng", value: profile.markets },
                { label: "Khoảng doanh thu tự nguyện", value: profile.revenueBand },
                { label: "Nhóm nhà cung cấp quan trọng", value: profile.supplierGroupsText },
                { label: "Nhóm đối tác đầu ra", value: profile.downstreamGroupsText },
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
          </View>
        ) : null}

        <SectionHead
          breakBefore
          kicker="R02 / MÔI TRƯỜNG"
          title="Tổng quan môi trường"
          intro={COPY.envIntro}
          onPage={track("R02")}
        />
        <Kpis
          items={[
            { label: "Điện sử dụng", value: value(environment.electricity) },
            { label: "Nước sử dụng", value: value(environment.water) },
            { label: "Dữ liệu phát thải", value: environment.ghgStatus },
          ]}
        />
        {envPillar ? <PillarChart data={[envPillar]} /> : null}
        <Panel label="Nhận định theo hồ sơ" text={environment.overviewAssessment} soft />
        <Panel label="Những nội dung cần làm rõ" text={environment.overviewGaps} />

        <SectionHead kicker="R02 / NĂNG LƯỢNG" title="Năng lượng và sử dụng hiệu quả" intro={COPY.energyIntro} />
        <Facts
          items={[
            { label: "Điện tiêu thụ trong kỳ", value: value(environment.electricity) },
            { label: "Nguồn và cách tổng hợp", value: environment.electricity?.source ?? null },
            { label: "Nhiên liệu", value: value(environment.fuel), full: true },
            { label: "Nguồn nhiên liệu", value: environment.fuel?.source ?? null, full: true },
          ]}
        />
        <ItemList items={environment.energy.items} />
        <Panel label="Nhận định theo hồ sơ" text={environment.energy.assessment} soft />

        {environment.scope1 !== null || environment.scope2 !== null || environment.climate.items.length > 0 ? (
          <View>
            <SectionHead
              kicker="R02 / PHẦN KHAI BÁO MỞ RỘNG"
              title="Khí nhà kính và rủi ro khí hậu"
              intro={COPY.ghgIntro}
            />
            <DataTable
              columns={[
                { title: "Chỉ số", width: "34%" },
                { title: "Giá trị", width: "33%" },
                { title: "Nguồn, phạm vi", width: "33%" },
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
            <BarChart title="Phát thải khai báo" data={charts.ghg} unit="tCO₂e" />
            <Facts
              items={[{ label: "Phương pháp và ranh giới", value: environment.ghgMethod, full: true }]}
            />
            <ItemList items={environment.climate.items} />
            <Panel label="Nhận định theo hồ sơ" text={environment.climate.assessment} soft />
          </View>
        ) : null}

        <SectionHead kicker="R02 / TÀI NGUYÊN NƯỚC" title="Nước và nước thải" intro={COPY.waterIntro} />
        <Facts
          items={[
            { label: "Nước sử dụng", value: value(environment.water) },
            { label: "Phạm vi và nguồn số liệu", value: environment.water?.source ?? null },
            { label: "Thu gom, xử lý nước thải", value: value(environment.wastewater), full: true },
          ]}
        />
        <ItemList items={environment.waterSection.items} />
        <Panel label="Nhận định theo hồ sơ" text={environment.waterSection.assessment} soft />

        <SectionHead kicker="R02 / CHẤT THẢI" title="Chất thải và quản lý dòng thải" intro={COPY.wasteIntro} />
        <Facts
          items={[
            { label: "Chất thải không nguy hại", value: value(environment.wasteNonHazardous) },
            { label: "Nguồn số liệu", value: environment.wasteNonHazardous?.source ?? null },
            { label: "Chất thải nguy hại", value: value(environment.wasteHazardous) },
            { label: "Nguồn số liệu", value: environment.wasteHazardous?.source ?? null },
          ]}
        />
        <BarChart title="Chất thải khai báo" data={charts.waste} unit="tấn" />
        <ItemList items={environment.waste.items} />
        <Panel label="Nhận định theo hồ sơ" text={environment.waste.assessment} soft />

        {environment.materials.items.length > 0 ? (
          <View>
            <SectionHead
              kicker="R02 / CÁC TÁC ĐỘNG LIÊN QUAN"
              title="Vật liệu và tác động tại cơ sở"
              intro={COPY.materialsIntro}
            />
            <ItemList items={environment.materials.items} />
            <Panel label="Nhận định theo hồ sơ" text={environment.materials.assessment} soft />
          </View>
        ) : null}

        <SectionHead
          kicker="R02 / THEO DÕI VÀ CẢI THIỆN"
          title="Sự cố và mục tiêu môi trường"
          intro={COPY.incidentIntro}
        />
        <ItemList items={environment.incident ? [environment.incident] : []} />
        <ItemList items={environment.targets.items} />
        <Panel label="Nhận định theo hồ sơ" text={environment.targets.assessment} soft />

        <SectionHead
          breakBefore
          kicker="R03 / NGƯỜI LAO ĐỘNG VÀ XÃ HỘI"
          title="Con người và điều kiện làm việc"
          intro={COPY.workforceIntro}
          onPage={track("R03")}
        />
        <Kpis items={[{ label: "Người lao động cuối kỳ", value: value(social.headcount) }]} />
        <Facts
          items={[
            { label: "Phạm vi người lao động", value: social.workerScope, full: true },
            { label: "Cơ cấu lao động", value: value(social.workforceTable), full: true },
          ]}
        />
        <ItemList items={social.workforce.items} />
        <Panel label="Nhận định theo hồ sơ" text={social.workforce.assessment} soft />

        <SectionHead kicker="R03 / MÔI TRƯỜNG LÀM VIỆC" title="An toàn và sức khỏe nghề nghiệp" intro={COPY.safetyIntro} />
        <Kpis
          items={[
            { label: "Tai nạn lao động trong kỳ", value: value(social.accidents) },
            { label: "Tử vong liên quan công việc", value: value(social.fatalities) },
          ]}
        />
        <ItemList items={social.safety.items} />
        <Panel label="Nhận định theo hồ sơ" text={social.safety.assessment} soft />

        <SectionHead kicker="R03 / ĐỐI XỬ CÓ TRÁCH NHIỆM" title="Quyền lao động và đối thoại" intro={COPY.labourIntro} />
        <ItemList items={social.labour.items} />
        <Panel label="Nhận định theo hồ sơ" text={social.labour.assessment} soft />
        <Note>{COPY.labourNote}</Note>

        <SectionHead
          kicker="R03 / ĐÀO TẠO VÀ QUAN HỆ XÃ HỘI"
          title="Năng lực và quan hệ với các bên"
          intro={COPY.communityIntro}
        />
        <Kpis items={[{ label: "Tổng thời lượng đào tạo", value: value(social.trainingHours) }]} />
        <Facts items={[{ label: "Nguồn tổng hợp", value: social.trainingHours?.source ?? null, full: true }]} />
        <ItemList items={social.community.items} />
        <Panel label="Nhận định theo hồ sơ" text={social.community.assessment} soft />

        <SectionHead
          breakBefore
          kicker="R04 / QUẢN TRỊ"
          title="Trách nhiệm và điều phối ESG"
          intro={COPY.governanceIntro}
          onPage={track("R04")}
        />
        <Facts
          items={[
            { label: "Vai trò điều phối ESG", value: governance.esgRole },
            { label: "Cơ chế xem xét của lãnh đạo", value: governance.leadershipReview },
            { label: "Các vấn đề được doanh nghiệp lựa chọn ưu tiên", value: governance.priorities, full: true },
          ]}
        />
        <ItemList items={governance.coordination.items} />
        <Panel label="Nhận định theo hồ sơ" text={governance.coordination.assessment} soft />

        <SectionHead kicker="R04 / ĐẠO ĐỨC VÀ MINH BẠCH" title="Liêm chính và cơ chế phản ánh" intro={COPY.integrityIntro} />
        <ItemList items={governance.integrityIncident ? [governance.integrityIncident] : []} />
        <ItemList items={governance.integrity.items} />
        <Panel label="Nhận định theo hồ sơ" text={governance.integrity.assessment} soft />
        <Note>{COPY.integrityNote}</Note>

        <SectionHead kicker="R04 / QUAN HỆ KINH DOANH" title="Mua sắm và chuỗi cung ứng" intro={COPY.supplyIntro} />
        <ItemList items={governance.supply.items} />
        <DataTable
          columns={[
            { title: "Nhóm nhà cung cấp", width: "34%" },
            { title: "Tiêu chí, rủi ro được nêu", width: "33%" },
            { title: "Cách xử lý được khai", width: "33%" },
          ]}
          rows={profile.supplierGroups.map((group) => [group.name, group.risk, group.response])}
        />
        <Panel label="Nhận định theo hồ sơ" text={governance.supply.assessment} soft />
        <Note>{COPY.supplyNote}</Note>

        <SectionHead kicker="R04 / KIỂM SOÁT VÀ TÍNH LIÊN TỤC" title="Dữ liệu và chất lượng thông tin" intro={COPY.dataIntro} />
        <ItemList items={governance.data.items} />
        <Panel label="Nhận định theo hồ sơ" text={governance.data.assessment} soft />
        <Note>{COPY.dataNote}</Note>

        {model.modules.map((module, index) => (
          <View key={module.source}>
            <SectionHead
              breakBefore={index === 0}
              kicker="R05 / NỘI DUNG THEO NGÀNH"
              title={module.title}
              onPage={index === 0 ? track("R05") : undefined}
            />
            <Facts
              items={[
                { label: "Ngành, hoạt động được áp dụng", value: module.scope },
                { label: "Cơ sở và giới hạn", value: module.limits },
              ]}
            />
            <ItemList items={module.items} />
            <SubHead>Nhận định theo hoạt động</SubHead>
            <Text style={styles.body}>{module.assessment ?? "Chưa có đủ nội dung khai báo để nhận định."}</Text>
            <Note>{COPY.moduleNote}</Note>
          </View>
        ))}

        <SectionHead
          breakBefore
          kicker="R06 / TỪ DỮ LIỆU ĐẾN HÀNH ĐỘNG"
          title="Khoảng trống và ưu tiên cải thiện"
          intro={COPY.gapsIntro}
          onPage={track("R06")}
        />
        <DataTable
          columns={[
            { title: "Vấn đề", width: "30%" },
            { title: "Căn cứ", width: "40%" },
            { title: "Ưu tiên đã chọn", width: "30%" },
          ]}
          rows={improvement.gaps.map((gap) => [gap.title, gap.reason, gap.priority])}
        />
        <BarChart title="Khoảng trống theo chủ đề" data={charts.gapsByTopic} unit="" />
        <Panel label="Những việc cần xác minh thêm" text={improvement.followups} />
        <Panel label="Trọng tâm cho kỳ tiếp theo" text={improvement.focus} />
        <Note>{COPY.gapsNote}</Note>

        <SectionHead kicker="R06 / LỘ TRÌNH CẢI THIỆN" title="Kế hoạch hành động" intro={COPY.actionsIntro} />
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
        <Facts
          items={[
            { label: "Kết quả mong muốn", value: improvement.goal, full: true },
            { label: "Nguồn lực được xác nhận", value: improvement.resources },
            { label: "Chu kỳ xem xét", value: improvement.reviewCycle },
          ]}
        />
        <Note>{COPY.actionsNote}</Note>

        {images.length > 0 ? (
          <View>
            <SectionHead
              breakBefore
              kicker="R07 / CĂN CỨ TRỰC QUAN"
              title="Hình ảnh và minh chứng chọn lọc"
              intro={COPY.imagesIntro}
              onPage={track("R07")}
            />
            <EvidenceGallery images={images} />
            <Note>{COPY.imagesNote}</Note>
          </View>
        ) : null}

        <SectionHead
          breakBefore={images.length === 0}
          kicker="R07 / TRUY XUẤT THÔNG TIN"
          title="Danh mục căn cứ và giới hạn"
          intro={COPY.evidenceIntro}
          onPage={images.length === 0 ? track("R07") : undefined}
        />
        <DataTable
          columns={[
            { title: "Mã căn cứ", width: "14%" },
            { title: "Nội dung, câu liên quan", width: "46%" },
            { title: "Kỳ, phạm vi", width: "22%" },
            { title: "Tình trạng", width: "18%" },
          ]}
          rows={evidence.rows.map((row) => [row.id, row.description, row.scope, row.status])}
        />
        <Panel label="Giới hạn dữ liệu" text={evidence.limitations} />
        <Panel label="Tham chiếu công bố được phép" text={evidence.permittedReferences} />
        <Panel label="Tình trạng xác minh" text={evidence.verificationStatement} soft />
        <Note>{COPY.evidenceNote}</Note>

        <SectionHead
          breakBefore
          kicker="R07 / CHI TIẾT HỒ SƠ"
          title="Phụ lục câu trả lời"
          intro={COPY.appendixIntro}
        />
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

        <SectionHead
          breakBefore
          kicker="R07 / KIỂM SOÁT PHIÊN BẢN"
          title="Xác nhận và thông tin phát hành"
          intro={COPY.confirmIntro}
        />
        <Facts
          items={[
            { label: "Đơn vị báo cáo", value: meta.companyName },
            { label: "Vai trò người xác nhận", value: confirmation.role },
            { label: "Thời điểm xác nhận", value: confirmation.confirmedAt },
            { label: "Trạng thái xác nhận", value: confirmation.status },
            { label: "Ngày phát hành", value: meta.issuedAt },
            { label: "Mã hồ sơ / phiên bản", value: `${meta.reportId} / ${meta.reportVersion}` },
            { label: "Bộ câu hỏi / dữ liệu", value: `${meta.contentVersion} / ${meta.answerVersion}` },
          ]}
        />
        <SubHead>Kênh truy xuất hồ sơ</SubHead>
        <Text style={styles.body}>{meta.reportReference}</Text>
        <Note>{COPY.confirmNote}</Note>
        <Text style={[styles.h2, { marginTop: 24 }]}>ESG REPORT ONLINE</Text>
        <Text style={styles.body}>{COPY.closing}</Text>
      </Page>
    </Document>
  );
}
