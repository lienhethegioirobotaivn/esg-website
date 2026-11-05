"use client";

import { PLAN_STATUSES } from "@esg/shared";
import type {
  ImprovementPlanInput,
  PlanTaskInput,
  ReportSuggestion,
} from "@esg/shared";
import { Plus, Trash2 } from "lucide-react";

import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

const statusOptions = PLAN_STATUSES.map((value) => ({ value, label: value }));

interface ImprovementPlanCardProps {
  plan: ImprovementPlanInput;
  suggestions: readonly ReportSuggestion[];
  onChange: (plan: ImprovementPlanInput) => void;
}

function createTask(description = "", fromId = ""): PlanTaskInput {
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    fromId,
    description,
    owner: "",
    due: "",
    status: PLAN_STATUSES[0],
  };
}

export function ImprovementPlanCard({
  plan,
  suggestions,
  onChange,
}: ImprovementPlanCardProps) {
  const addedIds = new Set(
    plan.tasks.map((task) => task.fromId).filter((id) => id !== ""),
  );
  const available = suggestions.filter((item) => !addedIds.has(item.id));
  const filledCount = plan.tasks.filter(
    (task) => task.description.trim() !== "",
  ).length;

  function updateTask(id: string, patch: Partial<PlanTaskInput>) {
    onChange({
      ...plan,
      tasks: plan.tasks.map((task) =>
        task.id === id ? { ...task, ...patch } : task,
      ),
    });
  }

  function removeTask(id: string) {
    onChange({ ...plan, tasks: plan.tasks.filter((task) => task.id !== id) });
  }

  function addTask(task: PlanTaskInput) {
    onChange({ ...plan, tasks: [...plan.tasks, task] });
  }

  return (
    <div className="mt-6">
      <Card>
        <details>
          <summary className="cursor-pointer px-5 py-3 text-base font-semibold">
            Kế hoạch cải thiện ESG (tùy chọn)
            {filledCount > 0 ? (
              <span className="ml-2 text-[0.8125rem] font-normal text-muted">
                {filledCount} đầu việc
              </span>
            ) : null}
          </summary>

          <div className="space-y-5 border-t border-border px-5 py-4">
            <p className="text-[0.8125rem] leading-relaxed text-muted">
              Không bắt buộc. Nếu bạn không thêm đầu việc nào, báo cáo sẽ không
              có phần kế hoạch của doanh nghiệp.
            </p>

            <div className="space-y-4">
              {plan.tasks.map((task, index) => {
                const needsDescription =
                  task.description.trim() === "" &&
                  (task.owner.trim() !== "" || task.due !== "");
                return (
                  <div
                    key={task.id}
                    className="space-y-3 rounded-card border border-border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        Đầu việc {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => removeTask(task.id)}
                        leadingIcon={<Trash2 aria-hidden className="size-4" />}
                      >
                        Xóa
                      </Button>
                    </div>

                    <Field
                      label="Công việc cần thực hiện"
                      htmlFor={`plan-description-${task.id}`}
                      error={
                        needsDescription
                          ? "Nhập nội dung công việc để dòng này được đưa vào báo cáo."
                          : undefined
                      }
                    >
                      <Textarea
                        id={`plan-description-${task.id}`}
                        value={task.description}
                        onChange={(event) =>
                          updateTask(task.id, {
                            description: event.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Ví dụ: Ban hành quy trình sao lưu dữ liệu"
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Field
                        label="Người/bộ phận phụ trách"
                        htmlFor={`plan-owner-${task.id}`}
                      >
                        <Input
                          id={`plan-owner-${task.id}`}
                          value={task.owner}
                          onChange={(event) =>
                            updateTask(task.id, { owner: event.target.value })
                          }
                          placeholder="Tên người hoặc bộ phận"
                        />
                      </Field>
                      <Field
                        label="Hạn hoàn thành"
                        htmlFor={`plan-due-${task.id}`}
                      >
                        <Input
                          id={`plan-due-${task.id}`}
                          type="date"
                          value={task.due}
                          onChange={(event) =>
                            updateTask(task.id, { due: event.target.value })
                          }
                        />
                      </Field>
                      <Field
                        label="Trạng thái"
                        htmlFor={`plan-status-${task.id}`}
                      >
                        <Select
                          id={`plan-status-${task.id}`}
                          value={task.status}
                          onChange={(event) =>
                            updateTask(task.id, { status: event.target.value })
                          }
                          options={statusOptions}
                          placeholder="Chọn trạng thái"
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                onClick={() => addTask(createTask())}
                leadingIcon={<Plus aria-hidden className="size-4" />}
              >
                Thêm đầu việc
              </Button>
            </div>

            {suggestions.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Thêm từ đề xuất của hệ thống
                </h3>
                <p className="text-[0.8125rem] leading-relaxed text-muted">
                  Đề xuất được tạo từ các câu trả lời cần bổ sung hoặc làm rõ.
                  Bấm “Thêm” để đưa một đề xuất thành đầu việc của bạn, sau đó
                  điền người phụ trách, hạn và trạng thái. Đề xuất chưa được
                  thêm sẽ vẫn xuất hiện trong báo cáo dưới mục “Đề xuất cải
                  thiện chưa được doanh nghiệp xác nhận”.
                </p>
                {available.length === 0 ? (
                  <p className="text-[0.8125rem] text-muted">
                    Tất cả đề xuất đã được thêm vào kế hoạch.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {available.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-card border border-border p-3"
                      >
                        <div className="min-w-0 text-[0.8125rem] leading-relaxed">
                          <p>{item.text}</p>
                          <p className="text-muted">
                            {item.basis} • Gợi ý ưu tiên: {item.priority}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            addTask(createTask(item.text, item.id))
                          }
                          leadingIcon={<Plus aria-hidden className="size-4" />}
                        >
                          Thêm
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Mục tiêu và cách theo dõi
              </h3>
              <Field label="Kết quả mong muốn" htmlFor="plan-goal">
                <Textarea
                  id="plan-goal"
                  value={plan.goal}
                  onChange={(event) =>
                    onChange({ ...plan, goal: event.target.value })
                  }
                  rows={2}
                />
              </Field>
              <Field label="Nguồn lực" htmlFor="plan-resources">
                <Textarea
                  id="plan-resources"
                  value={plan.resources}
                  onChange={(event) =>
                    onChange({ ...plan, resources: event.target.value })
                  }
                  rows={2}
                  placeholder="Nhân sự, ngân sách hoặc công cụ dự kiến"
                />
              </Field>
              <Field label="Chu kỳ xem xét" htmlFor="plan-review-cycle">
                <Input
                  id="plan-review-cycle"
                  value={plan.reviewCycle}
                  onChange={(event) =>
                    onChange({ ...plan, reviewCycle: event.target.value })
                  }
                  placeholder="Ví dụ: Hằng quý"
                />
              </Field>
            </div>
          </div>
        </details>
      </Card>
    </div>
  );
}
