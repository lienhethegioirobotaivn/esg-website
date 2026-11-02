import { Container } from "@/components/ui";
import { AdminWorkspace } from "@/features/admin";

export default function AdminPage() {
  return (
    <main>
      <Container className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Quản trị bộ câu hỏi ESG
          <span className="text-primary-500">.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Ba phần Môi trường, Xã hội, Quản trị là cố định. Thêm, sửa, xóa và sắp
          xếp nhóm và câu hỏi bên trong. Thay đổi hiển thị ở trang khảo sát khi
          bạn quay lại.
        </p>
        <div className="mt-8">
          <AdminWorkspace />
        </div>
      </Container>
    </main>
  );
}
