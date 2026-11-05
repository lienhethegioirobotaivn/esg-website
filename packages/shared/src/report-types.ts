export interface ReportEvidenceInput {
  readonly name: string;
  readonly mimeType: string;
}

export interface ReportAnswerInput {
  readonly value: string | null;
  readonly number: string;
  readonly description: string;
  readonly evidence: readonly ReportEvidenceInput[];
}

export const PLAN_STATUSES = [
  "Chưa bắt đầu",
  "Đang thực hiện",
  "Hoàn thành",
  "Tạm hoãn",
] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

export interface PlanTaskInput {
  readonly id: string;
  readonly fromId: string;
  readonly description: string;
  readonly owner: string;
  readonly due: string;
  readonly status: string;
}

export interface ImprovementPlanInput {
  readonly tasks: readonly PlanTaskInput[];
  readonly goal: string;
  readonly resources: string;
  readonly reviewCycle: string;
}

export const EMPTY_PLAN: ImprovementPlanInput = {
  tasks: [],
  goal: "",
  resources: "",
  reviewCycle: "",
};

export interface ReportSuggestion {
  readonly id: string;
  readonly text: string;
  readonly basis: string;
  readonly priority: string;
}

export interface ReportItem {
  readonly id: string;
  readonly label: string;
  readonly answer: string;
  readonly evidence: string;
}

export type MetricState = "known" | "unknown" | "na" | "empty";

export interface ReportMetric {
  readonly id: string;
  readonly state: MetricState;
  readonly text: string;
  readonly value: number | null;
  readonly unit: string;
  readonly source: string;
}

export interface PracticeCounts {
  readonly yes: number;
  readonly partial: number;
  readonly no: number;
  readonly unknown: number;
  readonly na: number;
  readonly unanswered: number;
  readonly total: number;
}

export interface ReportSite {
  readonly name: string;
  readonly scope: string;
  readonly limit: string;
}

export interface ReportSupplierGroup {
  readonly name: string;
  readonly risk: string;
  readonly response: string;
}

export interface ReportGap {
  readonly title: string;
  readonly reason: string;
  readonly priority: string;
}

export interface ReportAction {
  readonly description: string;
  readonly owner: string;
  readonly due: string;
  readonly status: PlanStatus;
}

export interface ReportEvidenceRow {
  readonly id: string;
  readonly description: string;
  readonly scope: string;
  readonly status: string;
}

export interface ReportEvidenceFile {
  readonly code: string;
  readonly name: string;
}

export interface ReportEvidenceGroup {
  readonly questionId: string;
  readonly label: string;
  readonly text: string;
  readonly note: string | null;
  readonly files: readonly ReportEvidenceFile[];
}

export interface ReportAppendixRow {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly evidence: string;
}

export interface ReportSection {
  readonly items: readonly ReportItem[];
  readonly assessment: string | null;
}

export interface ReportModule {
  readonly source: string;
  readonly title: string;
  readonly scope: string;
  readonly limits: string | null;
  readonly items: readonly ReportItem[];
  readonly assessment: string | null;
}

export interface ChartDatum {
  readonly label: string;
  readonly value: number;
}

export interface ReportModel {
  readonly meta: {
    readonly companyName: string;
    readonly tradingName: string | null;
    readonly registrationId: string | null;
    readonly legalForm: string | null;
    readonly period: string;
    readonly reportId: string;
    readonly status: string;
    readonly isDraft: boolean;
    readonly issuedAt: string;
    readonly disclosureLevel: string;
    readonly contentVersion: string;
    readonly answerVersion: string;
    readonly reportVersion: string;
    readonly reviewStatus: string;
    readonly countries: string | null;
    readonly reportReference: string;
  };
  readonly summary: {
    readonly answeredCount: number;
    readonly evidenceCount: number;
    readonly openItemsCount: number;
    readonly executiveSummary: string;
    readonly priorities: readonly string[];
    readonly practice: PracticeCounts;
  };
  readonly profile: {
    readonly primarySector: string;
    readonly secondarySectors: string | null;
    readonly sizeBand: string;
    readonly activities: string | null;
    readonly orgContext: string;
    readonly capabilities: string | null;
    readonly employeesPresence: string | null;
    readonly contractorPresence: string | null;
    readonly sites: readonly ReportSite[];
    readonly scopeLimitations: string | null;
    readonly products: string | null;
    readonly markets: string | null;
    readonly revenueBand: string | null;
    readonly supplierGroupsText: string | null;
    readonly downstreamGroupsText: string | null;
    readonly supplierGroups: readonly ReportSupplierGroup[];
    readonly valueChainContext: string | null;
  };
  readonly environment: {
    readonly electricity: ReportMetric | null;
    readonly water: ReportMetric | null;
    readonly ghgStatus: string | null;
    readonly overviewAssessment: string | null;
    readonly overviewGaps: string | null;
    readonly energy: ReportSection;
    readonly fuel: ReportMetric | null;
    readonly climate: ReportSection;
    readonly scope1: ReportMetric | null;
    readonly scope2: ReportMetric | null;
    readonly ghgMethod: string | null;
    readonly ghgSources: string | null;
    readonly waterSection: ReportSection;
    readonly wastewater: ReportMetric | null;
    readonly waste: ReportSection;
    readonly wasteNonHazardous: ReportMetric | null;
    readonly wasteHazardous: ReportMetric | null;
    readonly materials: ReportSection;
    readonly incident: ReportItem | null;
    readonly targets: ReportSection;
  };
  readonly social: {
    readonly headcount: ReportMetric | null;
    readonly workerScope: string | null;
    readonly workforceTable: ReportMetric | null;
    readonly workforce: ReportSection;
    readonly accidents: ReportMetric | null;
    readonly fatalities: ReportMetric | null;
    readonly safety: ReportSection;
    readonly labour: ReportSection;
    readonly trainingHours: ReportMetric | null;
    readonly community: ReportSection;
  };
  readonly governance: {
    readonly esgRole: string | null;
    readonly leadershipReview: string | null;
    readonly coordination: ReportSection;
    readonly priorities: string | null;
    readonly integrity: ReportSection;
    readonly integrityIncident: ReportItem | null;
    readonly supply: ReportSection;
    readonly data: ReportSection;
  };
  readonly modules: readonly ReportModule[];
  readonly improvement: {
    readonly gaps: readonly ReportGap[];
    readonly followups: string | null;
    readonly focus: string | null;
    readonly actions: readonly ReportAction[];
    readonly suggestions: readonly ReportSuggestion[];
    readonly goal: string | null;
    readonly resources: string | null;
    readonly reviewCycle: string | null;
  };
  readonly evidence: {
    readonly rows: readonly ReportEvidenceRow[];
    readonly groups: readonly ReportEvidenceGroup[];
    readonly limitations: string;
    readonly permittedReferences: string;
    readonly verificationStatement: string;
  };
  readonly appendix: {
    readonly rows: readonly ReportAppendixRow[];
    readonly unansweredSummary: string | null;
  };
  readonly confirmation: {
    readonly role: string | null;
    readonly confirmedAt: string | null;
    readonly status: string;
  };
  readonly charts: {
    readonly practiceStatus: readonly ChartDatum[];
    readonly pillarStatus: readonly {
      readonly label: string;
      readonly yes: number;
      readonly partial: number;
      readonly gap: number;
    }[];
    readonly ghg: readonly ChartDatum[];
    readonly waste: readonly ChartDatum[];
    readonly gapsByTopic: readonly ChartDatum[];
    readonly supplyChain: {
      readonly suppliers: readonly string[];
      readonly downstream: readonly string[];
    } | null;
  };
}
