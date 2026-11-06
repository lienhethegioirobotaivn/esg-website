import { Container } from "@/components/ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-border-strong bg-surface">
      <Container className="py-4 text-[0.8rem] text-subtle">
        Hồ sơ tự khai phục vụ quản lý nội bộ, quý khách cần hồ sơ ESG được thẩm
        định bởi tổ chức uy tín với mục đích xuất khẩu vui lòng liên hệ:{" "}
        <a href="tel:0372831697" className="underline">
          0372.831.697
        </a>
      </Container>
    </footer>
  );
}
