import { z } from "zod";

import { INDUSTRY_SOURCES } from "./constants";

export const LEGAL_FORMS = [
  "Công ty cổ phần",
  "Công ty TNHH",
  "Doanh nghiệp tư nhân",
  "Hợp tác xã",
  "Loại hình khác",
] as const;

export const REVENUE_BANDS = [
  { value: "lt3", label: "Dưới 3 tỷ đồng" },
  { value: "3to10", label: "3 đến dưới 10 tỷ đồng" },
  { value: "10to50", label: "10 đến dưới 50 tỷ đồng" },
  { value: "50to200", label: "50 đến dưới 200 tỷ đồng" },
  { value: "gte200", label: "Từ 200 tỷ đồng" },
  { value: "undisclosed", label: "Không cung cấp" },
] as const;

export const CAPABILITY_OPTIONS = [
  { value: "machinery", label: "Máy móc" },
  { value: "chemicals", label: "Hóa chất" },
  { value: "warehouse", label: "Kho" },
  { value: "fleet", label: "Vận tải" },
  { value: "construction", label: "Xây dựng" },
  { value: "food", label: "Thực phẩm" },
  { value: "animals", label: "Động vật" },
  { value: "minors", label: "Làm việc với trẻ em" },
  { value: "cloud_ai", label: "Cloud / AI" },
] as const;

export const PRESENCE_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
  { value: "unknown", label: "Chưa rõ" },
] as const;

export const PROFILE_FIELDS = [
  "tradingName",
  "legalForm",
  "countries",
  "sites",
  "secondarySectors",
  "activities",
  "capabilities",
  "hasEmployees",
  "hasContractors",
  "markets",
  "revenueBand",
  "supplierGroups",
  "downstreamGroups",
  "dataLimitations",
  "confirmingRole",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileValues = Record<ProfileField, string>;

const industryCodes = Object.keys(INDUSTRY_SOURCES);
const capabilityCodes: readonly string[] = CAPABILITY_OPTIONS.map(
  (option) => option.value,
);
const revenueCodes: readonly string[] = REVENUE_BANDS.map(
  (option) => option.value,
);
const presenceCodes: readonly string[] = PRESENCE_OPTIONS.map(
  (option) => option.value,
);

export function splitCodes(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

export function joinCodes(codes: readonly string[]): string {
  return codes.join(",");
}

function codesSchema(allowed: readonly string[], message: string) {
  return z.string().refine(
    (value) => splitCodes(value).every((code) => allowed.includes(code)),
    { message },
  );
}

function optionalText(max: number, label: string) {
  return z.string().trim().max(max, `${label} tối đa ${max} ký tự`);
}

export const profileSchema = z.object({
  tradingName: optionalText(150, "Tên giao dịch"),
  legalForm: z.enum(["", ...LEGAL_FORMS], {
    message: "Loại hình pháp lý không hợp lệ",
  }),
  countries: optionalText(300, "Quốc gia hoạt động"),
  sites: optionalText(2000, "Danh sách cơ sở"),
  secondarySectors: codesSchema(industryCodes, "Ngành bổ sung không hợp lệ"),
  activities: optionalText(1000, "Sản phẩm, dịch vụ chính"),
  capabilities: codesSchema(capabilityCodes, "Hoạt động đặc thù không hợp lệ"),
  hasEmployees: z.string().refine((value) => value === "" || presenceCodes.includes(value), {
    message: "Lựa chọn không hợp lệ",
  }),
  hasContractors: z.string().refine((value) => value === "" || presenceCodes.includes(value), {
    message: "Lựa chọn không hợp lệ",
  }),
  markets: optionalText(1000, "Thị trường và nhóm khách hàng"),
  revenueBand: z.string().refine((value) => value === "" || revenueCodes.includes(value), {
    message: "Khoảng doanh thu không hợp lệ",
  }),
  supplierGroups: optionalText(2000, "Nhóm nhà cung cấp"),
  downstreamGroups: optionalText(1000, "Nhóm đối tác đầu ra"),
  dataLimitations: optionalText(2000, "Giới hạn dữ liệu"),
  confirmingRole: optionalText(100, "Vai trò người xác nhận"),
});

export function parseTableLines(
  value: string,
  columns: number,
): string[][] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      while (cells.length < columns) {
        cells.push("");
      }
      return cells.slice(0, columns);
    });
}

export function findOptionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
