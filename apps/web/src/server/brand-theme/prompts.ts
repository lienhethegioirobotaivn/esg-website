import {
  REPORT_COVER_KINDS,
  REPORT_DENSITY_KINDS,
  REPORT_FONT_KINDS,
  REPORT_KPI_KINDS,
  REPORT_RADIUS_KINDS,
  REPORT_TABLE_HEAD_KINDS,
} from "@esg/shared";
import type { PaletteColor } from "@esg/shared";

export const BRAND_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    primary: { type: "STRING" },
    accent: { type: "STRING" },
    font: { type: "STRING", enum: [...REPORT_FONT_KINDS] },
    cover: { type: "STRING", enum: [...REPORT_COVER_KINDS] },
    tableHead: { type: "STRING", enum: [...REPORT_TABLE_HEAD_KINDS] },
    kpi: { type: "STRING", enum: [...REPORT_KPI_KINDS] },
    radius: { type: "STRING", enum: [...REPORT_RADIUS_KINDS] },
    density: { type: "STRING", enum: [...REPORT_DENSITY_KINDS] },
  },
  required: ["primary", "accent", "font", "cover", "tableHead", "kpi", "radius", "density"],
} as const;

export function buildBrandPrompt(palette: readonly PaletteColor[]): string {
  const colors =
    palette.length > 0
      ? palette
          .map((color) => `${color.hex} (khoảng ${Math.round(color.share * 100)}% diện tích)`)
          .join(", ")
      : "(không đọc được màu từ ảnh)";
  return [
    "Bạn là nhà thiết kế báo cáo. Các ảnh đính kèm là bộ nhận diện thương hiệu của một doanh nghiệp (logo, bảng màu, ấn phẩm). Hãy chọn giao diện cho báo cáo ESG (PDF và Word) sao cho đúng tinh thần thương hiệu đó.",
    "",
    `Các màu đã đo được từ ảnh: ${colors}.`,
    "",
    "Quy tắc:",
    "- primary: màu chủ đạo của thương hiệu, dùng cho tiêu đề, bìa và đầu bảng. Chữ trắng sẽ đặt lên màu này nên nên chọn màu đủ đậm.",
    "- accent: màu nhấn thứ hai, khác primary rõ rệt. Nếu thương hiệu chỉ có một màu thì chọn màu phụ gần nhất trong bảng màu.",
    "- primary và accent phải lấy từ danh sách màu đã đo (dạng #RRGGBB), không tự bịa màu mới.",
    "- font: serif nếu thương hiệu cổ điển, trang trọng, truyền thống; sans nếu hiện đại, công nghệ, gọn gàng.",
    "- cover (kiểu bìa): plain là bìa trắng tối giản; band là dải màu ở đầu trang; sidebar là cột màu bên trái; solid là khối màu lớn.",
    "- tableHead: solid là đầu bảng tô màu; underline là đầu bảng chỉ gạch chân.",
    "- kpi: solid là ô chỉ số tô màu; outline là ô chỉ số chỉ viền.",
    "- radius: square là góc vuông; soft là bo nhẹ; round là bo tròn nhiều. Chọn theo cảm giác của logo và ấn phẩm.",
    "- density: compact là dày, nhiều thông tin; normal là cân đối; airy là thoáng.",
    "- Ưu tiên giao diện chuyên nghiệp, dễ đọc trên giấy in. Không chọn những kiểu quá lòe loẹt.",
    "",
    "Chỉ trả về một đối tượng JSON đúng cấu trúc đã yêu cầu, không giải thích thêm.",
  ].join("\n");
}
