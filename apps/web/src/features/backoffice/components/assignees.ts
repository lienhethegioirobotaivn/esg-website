"use client";

import type { AssigneeView } from "@esg/shared";

import { useResource } from "../lib/use-resource";

export function useAssignees() {
  const resource = useResource<{ assignees: AssigneeView[] }>(
    "/admin/assignees",
  );
  const assignees = resource.data?.assignees ?? [];
  const options = assignees.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  return {
    options,
    optionsWith(current: string | null) {
      return current === null || options.some((item) => item.value === current)
        ? options
        : [
            ...options,
            { value: current, label: "Tài khoản không còn hoạt động" },
          ];
    },
    name(id: string | null): string {
      if (id === null) {
        return "Chưa giao";
      }
      const found = assignees.find((item) => item.id === id);
      if (found !== undefined) {
        return found.name;
      }
      return resource.data === null ? "..." : "Tài khoản không còn hoạt động";
    },
  };
}
