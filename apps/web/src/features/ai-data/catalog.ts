import type { HeadcountValue, IndustryValue } from "@esg/shared";

export interface CatalogEntry {
  readonly name: string;
  readonly industry: IndustryValue;
  readonly headcount: HeadcountValue;
  readonly year: string;
  readonly pdfUrl: string;
}

export const CATALOG: readonly CatalogEntry[] = [
  {
    name: "VinUni",
    industry: "education",
    headcount: "gte-500",
    year: "2024",
    pdfUrl:
      "https://sustainability.vinuni.edu.vn/wp-content/uploads/sites/19/2025/04/Bao-cao-Phat-trien-Ben-vung-2024.pdf",
  },
  {
    name: "SJ1",
    industry: "agriculture",
    headcount: "200-499",
    year: "2024",
    pdfUrl:
      "https://static2.vietstock.vn/vietstock/2024/12/26/2_sj1_2024_12_26_8e7b0f9_vi_baocaothuongnien_2024.pdf",
  },
  {
    name: "Toyota Việt Nam",
    industry: "manufacturing",
    headcount: "gte-500",
    year: "2023",
    pdfUrl:
      "https://www.toyota.com.vn/media/zvblxncn/baocao-ptbv-toyota-2023_05142024-3.pdf",
  },
];
