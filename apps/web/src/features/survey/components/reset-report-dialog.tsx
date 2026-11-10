"use client";

import { Button, Modal } from "@/components/ui";
import { useT } from "@/features/locale";

interface ResetReportDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

export function ResetReportDialog({
  onConfirm,
  onClose,
}: ResetReportDialogProps) {
  const t = useT();
  return (
    <Modal title={t("Bắt đầu một báo cáo mới?")} onClose={onClose}>
      <div className="space-y-3 text-sm text-muted">
        <p>
          {t(
            "Thông tin doanh nghiệp, các câu trả lời, mô tả, tệp bằng chứng và bản nháp đã lưu trên trình duyệt này sẽ bị xóa hết. Sau đó bạn sẽ điền lại từ câu đầu tiên, và không thể lấy lại nội dung cũ.",
          )}
        </p>
        <p>
          {t("Nếu muốn giữ kết quả hiện tại, hãy tạo báo cáo PDF trước khi xóa.")}
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t("Giữ lại báo cáo này")}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {t("Xóa và bắt đầu mới")}
        </Button>
      </div>
    </Modal>
  );
}
