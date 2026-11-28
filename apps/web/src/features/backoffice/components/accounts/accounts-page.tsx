"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";

import { formatDate, formatDateTime } from "../../lib/dates";
import { ROLE_LABELS } from "../../lib/labels";
import type { AdminUser } from "../../lib/types";
import { useResource } from "../../lib/use-resource";
import { useAdmin } from "../admin-shell";
import { Badge } from "../badge";
import { DataTable } from "../data-table";
import { PageHeader } from "../page-header";
import { LoadError, Loading } from "../states";
import { AccountDialog } from "./account-dialog";

type Editing = { account: AdminUser | null } | null;

function status(account: AdminUser) {
  if (!account.active) {
    return <Badge>Đã vô hiệu hóa</Badge>;
  }
  if (
    account.lockedUntil !== null &&
    new Date(account.lockedUntil).getTime() > Date.now()
  ) {
    return (
      <Badge tone="red">
        Khóa tạm đến {formatDateTime(account.lockedUntil)}
      </Badge>
    );
  }
  return <Badge tone="green">Hoạt động</Badge>;
}

export function AccountsPage() {
  const admin = useAdmin();
  const resource = useResource<{ users: AdminUser[] }>("/admin/users");
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tài khoản quản trị"
        description="Mỗi người một tài khoản. Không xóa tài khoản, chỉ vô hiệu hóa để giữ lịch sử."
        actions={
          <Button
            leadingIcon={<Plus aria-hidden className="size-4" />}
            onClick={() => setEditing({ account: null })}
          >
            Thêm tài khoản
          </Button>
        }
      />
      {resource.error ? (
        <LoadError error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data ? (
        <DataTable
          label="Danh sách tài khoản"
          rows={resource.data.users}
          rowKey={(row) => row.id}
          busy={resource.loading}
          empty="Chưa có tài khoản nào."
          columns={[
            {
              header: "Họ tên",
              cell: (row) => (
                <>
                  <div className="font-semibold">
                    {row.name}
                    {row.email === admin.email ? " (bạn)" : ""}
                  </div>
                  <div className="text-xs text-muted">{row.email}</div>
                </>
              ),
            },
            { header: "Vai trò", cell: (row) => ROLE_LABELS[row.role] },
            { header: "Trạng thái", cell: status },
            { header: "Ngày tạo", cell: (row) => formatDate(row.createdAt) },
            {
              header: <span className="sr-only">Thao tác</span>,
              className: "text-right",
              cell: (row) => (
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Pencil aria-hidden className="size-3.5" />}
                  onClick={() => setEditing({ account: row })}
                >
                  Sửa
                </Button>
              ),
            },
          ]}
        />
      ) : resource.loading ? (
        <Loading />
      ) : null}
      {editing ? (
        <AccountDialog
          account={editing.account}
          isSelf={editing.account?.email === admin.email}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            resource.reload();
          }}
        />
      ) : null}
    </div>
  );
}
