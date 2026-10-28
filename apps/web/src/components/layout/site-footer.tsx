import { Container } from "@/components/ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-1 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-medium text-muted">ESGstudio.</span> Đồng hành
          cùng doanh nghiệp phát triển bền vững.
        </p>
        <p>
          Hồ sơ tự khai phục vụ quản lý nội bộ, không thay thế chứng nhận hoặc
          thẩm định ESG.
        </p>
      </Container>
    </footer>
  );
}
