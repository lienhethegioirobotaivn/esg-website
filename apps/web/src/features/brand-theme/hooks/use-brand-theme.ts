import { BRAND_IMAGE_LIMITS, BRAND_IMAGE_MIME_TYPES, DEFAULT_REPORT_THEME } from "@esg/shared";
import type { BrandThemeResult, ReportTheme } from "@esg/shared";
import { useEffect, useMemo, useRef, useState } from "react";

import { useT } from "@/features/locale";
import { msg } from "@/features/locale/lib/translate";
import {
  clearBrandTheme,
  loadBrandTheme,
  saveBrandTheme,
} from "@/features/survey/lib/brand-theme-storage";

import { BrandImageError, prepareBrandImages } from "../lib/prepare-images";
import { BrandAnalysisError, requestBrandAnalysis } from "../lib/request-analysis";
import {
  draftFromResult,
  draftFromTheme,
  inputFromDraft,
  isDefaultDraft,
  themeFromDraft,
} from "../lib/theme-draft";
import type { BrandThemeDraft } from "../lib/theme-draft";

export interface BrandThemeState {
  files: readonly File[];
  consent: boolean;
  isAnalyzing: boolean;
  result: BrandThemeResult | null;
  error: string | null;
  pickError: string | null;
  draft: BrandThemeDraft;
  theme: ReportTheme;
  setConsent: (value: boolean) => void;
  addFiles: (incoming: readonly File[]) => void;
  removeFile: (index: number) => void;
  analyze: () => Promise<void>;
  changeDraft: (next: BrandThemeDraft) => void;
  resetTheme: () => void;
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function useBrandTheme(): BrandThemeState {
  const t = useT();
  const [files, setFiles] = useState<readonly File[]>([]);
  const [consent, setConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BrandThemeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BrandThemeDraft>(() => draftFromTheme(loadBrandTheme()));
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const theme = useMemo(() => themeFromDraft(draft), [draft]);

  function commit(next: BrandThemeDraft) {
    setDraft(next);
    if (isDefaultDraft(next)) {
      clearBrandTheme();
    } else {
      saveBrandTheme(inputFromDraft(next));
    }
  }

  function addFiles(incoming: readonly File[]) {
    setPickError(null);
    const accepted = [...files];
    const known = new Set(accepted.map(fileKey));
    for (const file of incoming) {
      if (!(BRAND_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
        setPickError(t(msg("Chỉ nhận ảnh PNG, JPG hoặc WEBP.")));
        continue;
      }
      if (file.size > BRAND_IMAGE_LIMITS.maxSourceBytes) {
        setPickError(t(msg("Ảnh quá lớn. Hãy chọn ít ảnh hơn hoặc ảnh nhẹ hơn.")));
        continue;
      }
      if (known.has(fileKey(file))) {
        continue;
      }
      if (accepted.length >= BRAND_IMAGE_LIMITS.maxImages) {
        setPickError(t(msg("Số ảnh vượt quá giới hạn cho phép.")));
        break;
      }
      known.add(fileKey(file));
      accepted.push(file);
    }
    setFiles(accepted);
  }

  function removeFile(index: number) {
    setPickError(null);
    setFiles((current) => current.filter((_, position) => position !== index));
  }

  async function analyze() {
    if (isAnalyzing) {
      return;
    }
    if (files.length === 0) {
      setError(t(msg("Hãy chọn ít nhất một ảnh.")));
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsAnalyzing(true);
    setError(null);
    try {
      const prepared = await prepareBrandImages(files);
      const analysis = await requestBrandAnalysis(prepared, consent, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setResult(analysis);
      commit(draftFromResult(analysis.theme));
    } catch (failure) {
      if (controller.signal.aborted) {
        return;
      }
      setError(
        failure instanceof BrandImageError || failure instanceof BrandAnalysisError
          ? t(failure.message)
          : t(msg("Không phân tích được bộ nhận diện thương hiệu.")),
      );
    } finally {
      if (controllerRef.current === controller) {
        setIsAnalyzing(false);
      }
    }
  }

  function resetTheme() {
    clearBrandTheme();
    setDraft(draftFromTheme(DEFAULT_REPORT_THEME));
    setResult(null);
    setError(null);
  }

  return {
    files,
    consent,
    isAnalyzing,
    result,
    error,
    pickError,
    draft,
    theme,
    setConsent,
    addFiles,
    removeFile,
    analyze,
    changeDraft: commit,
    resetTheme,
  };
}
