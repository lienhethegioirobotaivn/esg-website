"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { createT } from "../lib/translate";
import type { Messages, TFunction } from "../lib/translate";

const I18nContext = createContext<TFunction>(createT({}));

interface I18nProviderProps {
  messages: Messages;
  children: ReactNode;
}

export function I18nProvider({ messages, children }: I18nProviderProps) {
  const t = useMemo(() => createT(messages), [messages]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useT(): TFunction {
  return useContext(I18nContext);
}
