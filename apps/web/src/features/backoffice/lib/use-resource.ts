"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, SESSION_RESTORED_EVENT, getJson } from "./api";

interface ResourceState<T> {
  key: string;
  data: T | null;
  error: ApiError | null;
}

export interface Resource<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
  replace: (data: T) => void;
}

export function useResource<T>(path: string | null): Resource<T> {
  const [state, setState] = useState<ResourceState<T>>({
    key: "",
    data: null,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const key = path === null ? "" : `${version}:${path}`;

  useEffect(() => {
    if (path === null) {
      return;
    }
    const controller = new AbortController();
    const current = `${version}:${path}`;
    getJson<T>(path, controller.signal).then(
      (data) => setState({ key: current, data, error: null }),
      (caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const error =
          caught instanceof ApiError
            ? caught
            : new ApiError("Không đọc được dữ liệu. Vui lòng thử lại.", 0);
        setState((previous) => ({ key: current, data: previous.data, error }));
      },
    );
    return () => controller.abort();
  }, [path, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const replace = useCallback(
    (data: T) => setState((previous) => ({ ...previous, data, error: null })),
    [],
  );
  const failedStatus = state.error?.status;

  useEffect(() => {
    if (failedStatus !== 401) {
      return;
    }
    window.addEventListener(SESSION_RESTORED_EVENT, reload);
    return () => window.removeEventListener(SESSION_RESTORED_EVENT, reload);
  }, [failedStatus, reload]);

  return {
    data: state.data,
    error: state.key === key ? state.error : null,
    loading: path !== null && state.key !== key,
    reload,
    replace,
  };
}
