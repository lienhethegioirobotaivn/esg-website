"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";

import {
  downloadFile,
  errorMessage,
  withQuery,
  type QueryValue,
} from "../lib/api";
import { useNotify } from "./toast";

const FORMATS = [
  { format: "csv", label: "Xuất CSV" },
  { format: "xlsx", label: "Xuất Excel" },
] as const;

export function ExportButtons({
  path,
  baseName,
  params,
}: {
  path: string;
  baseName: string;
  params: Record<string, QueryValue>;
}) {
  const notify = useNotify();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(format: "csv" | "xlsx") {
    setBusy(format);
    try {
      await downloadFile(
        withQuery(path, { ...params, format }),
        `${baseName}.${format}`,
      );
    } catch (caught) {
      notify(errorMessage(caught, "Không xuất được tệp."), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {FORMATS.map((item) => (
        <Button
          key={item.format}
          variant="secondary"
          disabled={busy !== null}
          loading={busy === item.format}
          leadingIcon={<Download aria-hidden className="size-4" />}
          onClick={() => void run(item.format)}
        >
          {item.label}
        </Button>
      ))}
    </>
  );
}
