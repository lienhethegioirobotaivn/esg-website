export const SECTORS = {
  MAN: "sản xuất / chế biến / sản xuất công nghiệp",
  RET: "thương mại, bán lẻ, phân phối",
  SER: "dịch vụ (logistics, nhà hàng khách sạn, tư vấn, y tế, du lịch)",
  ICT: "công nghệ thông tin, phần mềm, viễn thông",
  CON: "xây dựng, bất động sản, vật liệu xây dựng",
  AGR: "nông nghiệp, thủy sản, lâm nghiệp",
  EDU: "giáo dục, đào tạo",
  OTH: "ngành đặc thù khác (năng lượng, môi trường, tài chính nhỏ...)",
} as const;

export type SectorCode = keyof typeof SECTORS;

export const SECTOR_CODES = Object.keys(SECTORS) as SectorCode[];

export function isSectorCode(value: string): value is SectorCode {
  return value in SECTORS;
}
