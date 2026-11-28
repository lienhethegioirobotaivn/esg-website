"use client";

import { PageHeader } from "../page-header";
import { FilesSection } from "./files-section";
import { JobsSection } from "./jobs-section";
import { OutboxSection } from "./outbox-section";
import { SettingsCard } from "./settings-card";

export function SystemPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Trạng thái và cài đặt"
        description="Chỉ quản trị viên nhìn thấy mục này."
      />
      <SettingsCard />
      <JobsSection />
      <OutboxSection />
      <FilesSection />
    </div>
  );
}
