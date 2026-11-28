"use client";

import type { BankCheckResult } from "@esg/shared";
import { useCallback, useEffect, useState } from "react";

import { ApiError, sendJson } from "@/features/backoffice/lib/api";

interface CheckState {
  key: string;
  result: BankCheckResult | null;
  error: ApiError | null;
}

export function useBankCheck(bankId: string) {
  const [state, setState] = useState<CheckState>({
    key: "",
    result: null,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const key = `${version}:${bankId}`;

  useEffect(() => {
    let active = true;
    const current = `${version}:${bankId}`;
    sendJson<BankCheckResult>(
      "POST",
      `/admin/question-banks/${bankId}/validate`,
    ).then(
      (result) => {
        if (active) {
          setState({ key: current, result, error: null });
        }
      },
      (caught: unknown) => {
        if (active) {
          setState({
            key: current,
            result: null,
            error:
              caught instanceof ApiError
                ? caught
                : new ApiError("Không kiểm tra được bộ câu hỏi.", 0),
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [bankId, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const fresh = state.key === key;

  return {
    result: fresh ? state.result : null,
    error: fresh ? state.error : null,
    loading: !fresh,
    reload,
  };
}
