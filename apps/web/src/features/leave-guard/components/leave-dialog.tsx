"use client";

import { useRouter } from "next/navigation";

import { Button, Modal } from "@/components/ui";

import { useLeaveGuardStore } from "../store/leave-guard-store";

export function LeaveDialog() {
  const router = useRouter();
  const guard = useLeaveGuardStore((state) => state.guard);
  const pendingHref = useLeaveGuardStore((state) => state.pendingHref);
  const cancelLeave = useLeaveGuardStore((state) => state.cancelLeave);

  if (guard === null || pendingHref === null) {
    return null;
  }

  const title = guard.hasUnsavedChanges
    ? "Bạn chưa lưu bản nháp"
    : "Tệp bằng chứng sẽ không được giữ lại";

  function leave() {
    if (pendingHref !== null) {
      router.push(pendingHref);
    }
  }

  function saveAndLeave() {
    guard?.onSave();
    leave();
  }

  return (
    <Modal title={title} onClose={cancelLeave}>
      <div className="space-y-3 text-sm text-muted">
        {guard.hasUnsavedChanges ? (
          <p>
            Những câu trả lời và thông tin doanh nghiệp bạn vừa nhập chưa được
            lưu. Nếu rời trang lúc này, các thay đổi đó sẽ mất.
          </p>
        ) : null}
        {guard.hasEvidence ? (
          <p>
            Tệp bằng chứng đã tải lên chưa thể lưu vào bản nháp, bạn sẽ cần tải
            lại sau khi quay lại.
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={leave}>
          Rời đi, không lưu
        </Button>
        <Button variant="secondary" onClick={cancelLeave}>
          Ở lại làm tiếp
        </Button>
        {guard.hasUnsavedChanges ? (
          <Button onClick={saveAndLeave}>Lưu nháp rồi rời đi</Button>
        ) : null}
      </div>
    </Modal>
  );
}
