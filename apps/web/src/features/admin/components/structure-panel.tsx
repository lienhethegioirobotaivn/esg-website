"use client";

import type { Pillar, Survey } from "@esg/shared";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button, Card, IconButton } from "@/components/ui";
import { PILLAR_ICON_COMPONENTS } from "@/features/survey";
import { cn } from "@/lib/cn";

interface StructurePanelProps {
  survey: Survey;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onAddPillar: () => void;
  onEditPillar: (pillar: Pillar) => void;
  onDeletePillar: (pillar: Pillar) => void;
  onAddGroup: (pillarId: string) => void;
}

export function StructurePanel({
  survey,
  selectedGroupId,
  onSelectGroup,
  onAddPillar,
  onEditPillar,
  onDeletePillar,
  onAddGroup,
}: StructurePanelProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.9375rem]">Cấu trúc bộ câu hỏi</h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={onAddPillar}
          leadingIcon={<Plus aria-hidden className="size-4" />}
        >
          Thêm trụ cột
        </Button>
      </div>

      {survey.length === 0 ? (
        <p className="mt-4 rounded-control border border-dashed border-border-strong p-4 text-center text-sm text-muted">
          Chưa có trụ cột nào. Hãy thêm trụ cột đầu tiên.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {survey.map((pillar) => {
            const Icon = PILLAR_ICON_COMPONENTS[pillar.icon];
            return (
              <section
                key={pillar.id}
                className="rounded-control border border-border"
              >
                <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-2.5">
                  <Icon
                    aria-hidden
                    className="size-4 shrink-0 text-primary-700"
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {pillar.name}
                  </p>
                  <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary-800">
                    {pillar.code}
                  </span>
                  <IconButton
                    label={`Sửa trụ cột ${pillar.name}`}
                    onClick={() => onEditPillar(pillar)}
                  >
                    <Pencil aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Xóa trụ cột ${pillar.name}`}
                    tone="danger"
                    onClick={() => onDeletePillar(pillar)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </div>

                <ul className="space-y-1 p-2">
                  {pillar.groups.map((group) => {
                    const isSelected = group.id === selectedGroupId;
                    return (
                      <li key={group.id}>
                        <button
                          type="button"
                          onClick={() => onSelectGroup(group.id)}
                          aria-current={isSelected ? "true" : undefined}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-[0.8125rem] transition-colors",
                            isSelected
                              ? "bg-primary-50 font-medium text-primary-900"
                              : "text-muted hover:bg-surface-muted",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {group.title}
                          </span>
                          <span className="shrink-0 text-xs text-subtle">
                            {group.questions.length} câu
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => onAddGroup(pillar.id)}
                      leadingIcon={<Plus aria-hidden className="size-4" />}
                    >
                      Thêm nhóm
                    </Button>
                  </li>
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
